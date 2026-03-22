// @ts-nocheck

export function createPlanExecutionRuntime(deps) {
  const {
    engine,
    executeViaEngine,
    getLicenseTier,
    normalizeProjectRoot,
    resolveProjectRootSafe,
    gateProfileCommand,
    evaluatePolicyGate,
    ensureStructuredSession,
    withStructuredSessionWrite,
    structuredSessionStore,
    safeSend,
    redactChunkIfNeeded,
    forRendererDisplay,
    agentdJson,
    buildAgentdHeaders,
    AGENTD_BASE_URL,
    running,
    ptyStreamOwners,
    closePtyForWebContents,
    createStreamId,
    runningPlanRuns,
    streamToPlanRun,
    addTranscriptEntry,
  } = deps

  function createConfirmationScope(step) {
    return `terminal.write:${step.command}`
  }

  function newPlanRunId() {
    return `plan_${Date.now()}_${Math.random().toString(16).slice(2)}`
  }

  function terminalWriteSafetyFields(stepRisk) {
    return {
      risk: 'safe-write',
      risk_level: 'medium',
      requires_confirmation: false,
      commandRisk: stepRisk,
    }
  }

  function toAgentdStep(step, projectRoot) {
    const toolSafety = terminalWriteSafetyFields(step.risk)
    return {
      stepId: step.id,
      tool: 'terminal.write',
      input: {
        command: step.command,
        cwd: projectRoot,
        timeoutMs: 60_000,
        stepId: step.id,
      },
      ...toolSafety,
      verification_plan: { steps: [] },
    }
  }

  async function startStreamingStepViaEngine(args) {
    const { webContents, streamId, step, confirmed, confirmationText, projectRoot: rawProjectRoot } = args
    const projectRoot = normalizeProjectRoot(rawProjectRoot)
    const risk = step.risk
    const profileGate = gateProfileCommand({
      projectRoot,
      command: step.command,
      risk,
      confirmed,
      confirmationText,
    })
    if (!profileGate.ok) {
      const error = profileGate.message
      safeSend(webContents, 'rina:stream:end', {
        streamId,
        ok: false,
        code: null,
        error,
      })
      return { ok: false, cancelled: false, error }
    }
    const sessionId = ensureStructuredSession({
      source: 'engine_step_stream',
      projectRoot,
    })
    withStructuredSessionWrite(() => {
      structuredSessionStore()?.beginCommand({
        sessionId: sessionId || undefined,
        streamId,
        command: step.command,
        cwd: projectRoot,
        risk,
        source: 'engine_step_stream',
      })
    })
    const policyGate = evaluatePolicyGate(step.command, confirmed, confirmationText)
    if (!policyGate.ok) {
      const error = policyGate.message || 'Blocked by policy.'
      safeSend(webContents, 'rina:stream:end', {
        streamId,
        ok: false,
        code: null,
        error,
      })
      withStructuredSessionWrite(() => {
        structuredSessionStore()?.endCommand({
          streamId,
          ok: false,
          code: null,
          cancelled: false,
          error,
        })
      })
      return { ok: false, cancelled: false, error }
    }
    let confirmationToken
    if (risk === 'high-impact') {
      if (!confirmed) {
        const error = 'Confirmation required for high-impact step.'
        safeSend(webContents, 'rina:stream:end', {
          streamId,
          ok: false,
          code: null,
          error,
        })
        return { ok: false, cancelled: false, error }
      }
      const scope = createConfirmationScope(step)
      confirmationToken = { kind: 'explicit', approved: true, scope }
    }
    safeSend(webContents, 'rina:stream:chunk', {
      streamId,
      stream: 'meta',
      data: `$ ${step.command}\n`,
    })
    withStructuredSessionWrite(() => {
      structuredSessionStore()?.appendChunk(streamId, 'meta', redactChunkIfNeeded(`$ ${step.command}\n`))
    })
    running.set(streamId, {
      cancelled: false,
      stepId: step.id,
      command: step.command,
    })
    const plan = [
      {
        tool: 'terminal.write',
        input: {
          command: step.command,
          cwd: projectRoot,
          timeoutMs: 60_000,
          stepId: step.id,
        },
        stepId: step.id,
        description: step.description ?? `Execute command: ${step.command}`,
        ...terminalWriteSafetyFields(risk),
        verification_plan: { steps: [] },
      },
    ]
    const report = await executeViaEngine({
      engine,
      plan,
      projectRoot,
      license: getLicenseTier(),
      confirmationToken,
      emit: (evt) => {
        const info = running.get(streamId)
        if (!info) return
        if (info.cancelled) return
        if (evt.type === 'chunk') {
          safeSend(webContents, 'rina:stream:chunk', {
            streamId,
            stream: evt.stream,
            data: forRendererDisplay(evt.data),
          })
          withStructuredSessionWrite(() => {
            const mapped = evt.stream === 'stderr' ? 'stderr' : 'stdout'
            structuredSessionStore()?.appendChunk(streamId, mapped, redactChunkIfNeeded(String(evt.data || '')))
          })
        }
      },
    })
    const info = running.get(streamId)
    const cancelled = info?.cancelled ?? false
    running.delete(streamId)
    const lastStep = report.steps.at(-1)
    const lastResult = lastStep?.result
    const exitCode = lastResult?.meta?.exitCode ?? null
    const error = cancelled
      ? 'Cancelled by user.'
      : report.ok
        ? null
        : lastResult && !lastResult.success
          ? (lastResult.error ?? 'Execution failed')
          : (report.haltedBecause ?? 'Execution failed')
    safeSend(webContents, 'rina:stream:end', {
      streamId,
      ok: cancelled ? false : report.ok,
      code: exitCode,
      cancelled,
      error,
      report,
    })
    withStructuredSessionWrite(() => {
      structuredSessionStore()?.endCommand({
        streamId,
        ok: cancelled ? false : report.ok,
        code: typeof exitCode === 'number' ? exitCode : null,
        cancelled,
        error,
      })
    })
    return {
      ok: cancelled ? false : report.ok,
      cancelled,
      error,
    }
  }

  async function cancelStream(streamId) {
    const id = String(streamId || '').trim()
    if (!id) return { ok: false, message: 'Missing streamId.' }
    const mappedPlanRunId = streamToPlanRun.get(id)
    if (mappedPlanRunId) {
      const st = runningPlanRuns.get(mappedPlanRunId)
      if (st) st.stopped = true
      if (st?.agentdPlanRunId) {
        try {
          await agentdJson('/v1/cancel', {
            method: 'POST',
            body: { planRunId: st.agentdPlanRunId, streamId: id, reason: 'soft' },
            includeLicenseToken: true,
          })
          return { ok: true, message: 'Cancellation requested.' }
        } catch (error) {
          return { ok: false, message: error instanceof Error ? error.message : 'Cancellation failed' }
        }
      }
      return { ok: true, message: 'Cancellation queued.' }
    }
    const entry = running.get(id)
    if (!entry) return { ok: false, message: 'No running process for that streamId.' }
    entry.cancelled = true
    return { ok: true, message: 'Cancellation requested.' }
  }

  async function hardKillStream(streamId) {
    const id = String(streamId || '').trim()
    if (!id) return { ok: false, message: 'Missing streamId.' }
    const ownerId = ptyStreamOwners.get(id)
    if (typeof ownerId === 'number') {
      closePtyForWebContents(ownerId)
      return { ok: true, message: 'PTY killed.' }
    }
    const mappedPlanRunId = streamToPlanRun.get(id)
    if (mappedPlanRunId) {
      const st = runningPlanRuns.get(mappedPlanRunId)
      if (st) st.stopped = true
      if (st?.agentdPlanRunId) {
        try {
          await agentdJson('/v1/cancel', {
            method: 'POST',
            body: { planRunId: st.agentdPlanRunId, streamId: id, reason: 'hard' },
            includeLicenseToken: true,
          })
        } catch (error) {
          return { ok: false, message: error instanceof Error ? error.message : 'Hard cancel failed' }
        }
      }
      return { ok: true, message: 'Hard cancellation queued.' }
    }
    const entry = running.get(id)
    if (entry) {
      entry.cancelled = true
      return { ok: true, message: 'Marked cancelled.' }
    }
    return { ok: false, message: 'No running process for that streamId.' }
  }

  async function executeStepStreamForIpc(args) {
    const { eventSender, step, confirmed, confirmationText, projectRoot } = args
    const streamId = createStreamId()
    const normalizedRoot = resolveProjectRootSafe(projectRoot)
    const profileGate = gateProfileCommand({
      projectRoot: normalizedRoot,
      command: step.command,
      risk: step.risk,
      confirmed,
      confirmationText,
    })
    if (!profileGate.ok) {
      safeSend(eventSender, 'rina:stream:end', {
        streamId,
        ok: false,
        code: null,
        cancelled: false,
        error: profileGate.message,
        report: { ok: false, haltedBecause: 'profile_blocked', steps: [] },
      })
      return { streamId }
    }
    const policyGate = evaluatePolicyGate(step.command, confirmed, confirmationText)
    if (!policyGate.ok) {
      safeSend(eventSender, 'rina:stream:end', {
        streamId,
        ok: false,
        code: null,
        cancelled: false,
        error: policyGate.message || 'Blocked by policy.',
        report: { ok: false, haltedBecause: 'policy_blocked', steps: [] },
      })
      return { streamId }
    }
    const sessionId = ensureStructuredSession({
      source: 'execute_step_stream',
      projectRoot: normalizedRoot,
    })
    withStructuredSessionWrite(() => {
      structuredSessionStore()?.beginCommand({
        sessionId: sessionId || undefined,
        streamId,
        command: step.command,
        cwd: normalizedRoot,
        risk: step.risk,
        source: 'execute_step_stream',
      })
    })
    addTranscriptEntry({
      type: 'approval',
      timestamp: new Date().toISOString(),
      stepId: step.id,
      command: step.command,
      risk: step.risk,
      approved: confirmed,
    })
    addTranscriptEntry({
      type: 'execution_start',
      timestamp: new Date().toISOString(),
      streamId,
      stepId: step.id,
      command: step.command,
    })
    const localPlanRunId = newPlanRunId()
    runningPlanRuns.set(localPlanRunId, { stopped: false })
    streamToPlanRun.set(streamId, localPlanRunId)
    void (async () => {
      try {
        try {
          const execResp = await agentdJson('/v1/execute-plan', {
            method: 'POST',
            body: {
              plan: [toAgentdStep(step, normalizedRoot)],
              projectRoot: normalizedRoot,
              confirmed,
              confirmationText: confirmationText ?? '',
            },
            includeLicenseToken: true,
          })
          const state = runningPlanRuns.get(localPlanRunId)
          if (state) state.agentdPlanRunId = execResp.planRunId
          const response = await fetch(
            `${AGENTD_BASE_URL}/v1/stream?planRunId=${encodeURIComponent(execResp.planRunId)}`,
            {
              method: 'GET',
              headers: buildAgentdHeaders({ includeLicenseToken: true }),
            }
          )
          if (!response.ok || !response.body) {
            throw new Error(`agentd stream failed (${response.status})`)
          }
          const decoder = new TextDecoder()
          const reader = response.body.getReader()
          let buffer = ''
          let haltedBecause
          let stepEndSent = false
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            while (true) {
              const sep = buffer.indexOf('\n\n')
              if (sep === -1) break
              const rawEvent = buffer.slice(0, sep)
              buffer = buffer.slice(sep + 2)
              const lines = rawEvent.split(/\r?\n/)
              let eventName = 'message'
              const dataLines = []
              for (const line of lines) {
                if (line.startsWith('event:')) eventName = line.slice(6).trim()
                if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
              }
              const payloadText = dataLines.join('\n')
              const payload = payloadText ? JSON.parse(payloadText) : {}
              if (eventName === 'chunk') {
                safeSend(eventSender, 'rina:stream:chunk', {
                  streamId,
                  stream: payload.stream,
                  data: forRendererDisplay(payload.data),
                })
                withStructuredSessionWrite(() => {
                  const mapped = payload.stream === 'stderr' ? 'stderr' : payload.stream === 'meta' ? 'meta' : 'stdout'
                  structuredSessionStore()?.appendChunk(streamId, mapped, redactChunkIfNeeded(String(payload.data || '')))
                })
                continue
              }
              if (eventName === 'plan_step_end') {
                const report = payload.report
                const lastResult = report?.steps?.[report.steps.length - 1]?.result
                const exitCode = lastResult?.meta?.exitCode ?? null
                const error = payload.ok ? null : report?.haltedBecause || lastResult?.error || 'Execution failed'
                stepEndSent = true
                safeSend(eventSender, 'rina:stream:end', {
                  streamId,
                  ok: !!payload.ok,
                  code: exitCode,
                  cancelled: false,
                  error,
                  report,
                })
                withStructuredSessionWrite(() => {
                  structuredSessionStore()?.endCommand({
                    streamId,
                    ok: !!payload.ok,
                    code: typeof exitCode === 'number' ? exitCode : null,
                    cancelled: false,
                    error,
                  })
                })
                continue
              }
              if (eventName === 'plan_halt') {
                haltedBecause = payload?.reason || 'halted'
                continue
              }
              if (eventName === 'plan_run_end' && haltedBecause && !stepEndSent) {
                safeSend(eventSender, 'rina:stream:end', {
                  streamId,
                  ok: false,
                  code: null,
                  cancelled: false,
                  error: haltedBecause,
                  report: { ok: false, haltedBecause, steps: [] },
                })
                withStructuredSessionWrite(() => {
                  structuredSessionStore()?.endCommand({
                    streamId,
                    ok: false,
                    code: null,
                    cancelled: false,
                    error: haltedBecause,
                  })
                })
              }
            }
          }
        } catch (error) {
          throw new Error(
            `Execution backend unavailable. No fallback execution was performed. Check connectivity/config and retry. (${error instanceof Error ? error.message : String(error)})`
          )
        }
      } catch (error) {
        safeSend(eventSender, 'rina:stream:end', {
          streamId,
          ok: false,
          code: null,
          cancelled: false,
          error: error instanceof Error ? error.message : 'Execution failed',
          report: { ok: false, haltedBecause: 'execution_failed', steps: [] },
        })
        withStructuredSessionWrite(() => {
          structuredSessionStore()?.endCommand({
            streamId,
            ok: false,
            code: null,
            cancelled: false,
            error: error instanceof Error ? error.message : 'Execution failed',
          })
        })
      } finally {
        streamToPlanRun.delete(streamId)
        runningPlanRuns.delete(localPlanRunId)
      }
    })()
    return { streamId }
  }

  return {
    createConfirmationScope,
    newPlanRunId,
    terminalWriteSafetyFields,
    toAgentdStep,
    startStreamingStepViaEngine,
    cancelStream,
    hardKillStream,
    executeStepStreamForIpc,
  }
}
