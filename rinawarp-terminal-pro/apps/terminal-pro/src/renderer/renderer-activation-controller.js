(function () {
  'use strict';

  function readAgentEval() {
    try {
      const raw = localStorage.getItem(AGENT_EVAL_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeAgentEval(rows) {
    try {
      localStorage.setItem(AGENT_EVAL_KEY, JSON.stringify(rows.slice(-200)));
    } catch {}
  }

  function recordAgentEval(row) {
    const rows = readAgentEval();
    rows.push({
      ts: Date.now(),
      mode,
      ok: !!row?.ok,
      haltedBecause: String(row?.haltedBecause || ""),
      durationMs: Number(row?.durationMs || 0),
      stepCount: Number(row?.stepCount || 0),
      intent: String(row?.intent || "").slice(0, 220),
    });
    writeAgentEval(rows);
  }

  function summarizeAgentEval() {
    const rows = readAgentEval();
    if (!rows.length) return { runs: 0, successRate: 0, medianDurationMs: 0, topHaltReasons: [] };
    const okCount = rows.filter((r) => r.ok).length;
    const durations = rows
      .map((r) => Number(r.durationMs || 0))
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b);
    const medianDurationMs = durations.length ? durations[Math.floor(durations.length / 2)] : 0;
    const haltCounts = {};
    for (const row of rows) {
      const key = String(row.haltedBecause || "").trim();
      if (!key) continue;
      haltCounts[key] = (haltCounts[key] || 0) + 1;
    }
    const topHaltReasons = Object.entries(haltCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));
    return {
      runs: rows.length,
      successRate: rows.length ? okCount / rows.length : 0,
      medianDurationMs,
      topHaltReasons,
    };
  }

  function getActivationState() {
    try {
      const raw = localStorage.getItem(ACTIVATION_STATE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.steps) return parsed;
      }
    } catch {}
    return {
      startedAt: Date.now(),
      completedAt: null,
      steps: {
        safe_command: false,
        plan_run: false,
        report_download: false,
      },
    };
  }

  function saveActivationState(state) {
    try {
      localStorage.setItem(ACTIVATION_STATE_KEY, JSON.stringify(state));
    } catch {}
  }

  function trackActivationEvent(event, properties = {}) {
    const payload = {
      event,
      properties,
      path: "desktop://terminal-pro/onboarding",
      href: "desktop://terminal-pro/onboarding",
      referrer: null,
      anon_id: localStorage.getItem("rw_anon_id") || "desktop-anon",
      session_id: localStorage.getItem("rw_session_id") || "desktop-session",
      at: Date.now(),
      utm: {},
    };
    try {
      fetch(ACTIVATION_EVENT_API, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }

  function renderActivationChecklist() {
    const state = getActivationState();
    const statusEl = document.getElementById("activationStatus");
    const stepsEl = document.getElementById("activationSteps");
    if (!statusEl || !stepsEl) return;

    const steps = state.steps || {};
    const doneCount = ["safe_command", "plan_run", "report_download"].filter((k) => !!steps[k]).length;
    const total = 3;
    statusEl.textContent = activationStatusText(state, doneCount, total);
    stepsEl.innerHTML = activationStepsHtml(steps);
  }

  function markActivationStep(stepName, extra = {}) {
    const state = getActivationState();
    if (!state.steps?.[stepName]) {
      state.steps[stepName] = true;
      trackActivationEvent("desktop_activation_step_done", { step: stepName, ...extra });
    }
    const allDone = !!state.steps.safe_command && !!state.steps.plan_run && !!state.steps.report_download;
    if (allDone && !state.completedAt) {
      state.completedAt = Date.now();
      const ttfvSec = Math.max(0, Math.round((state.completedAt - (state.startedAt || state.completedAt)) / 1000));
      trackActivationEvent("desktop_activation_complete", { ttfvSec });
      addBlock({
        id: newId("assistant"),
        type: "assistant",
        status: "ok",
        createdAt: Date.now(),
        title: "Rina — Activation Complete",
        markdown: `Great. You hit first success in **${ttfvSec}s**.`,
      });
      toast(`Activation complete in ${ttfvSec}s`);
    }
    saveActivationState(state);
    renderActivationChecklist();
  }

  window.RinaWarpActivationController = {
    readAgentEval,
    writeAgentEval,
    recordAgentEval,
    summarizeAgentEval,
    getState: getActivationState,
    saveState: saveActivationState,
    trackEvent: trackActivationEvent,
    renderChecklist: renderActivationChecklist,
    markStep: markActivationStep,
  };
})();
