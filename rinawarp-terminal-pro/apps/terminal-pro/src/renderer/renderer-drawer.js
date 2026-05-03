(function () {
  const { escapeHtml } = window.RinaRendererUtils;

  function renderListRow({ title = "", subtitles = [], meta = "", actions = "", interactive = false, compact = false, onclick = "" } = {}) {
    const classes = [
      "item",
      "list-row",
      interactive ? "list-row--interactive" : "",
      compact ? "list-row--compact" : "",
    ].filter(Boolean).join(" ");
    const attr = onclick ? ` onclick="${onclick}"` : "";
    const subtitleHtml = (Array.isArray(subtitles) ? subtitles : [subtitles])
      .filter((line) => line != null && line !== "")
      .map((line) => `<div class="list-row__subtitle">${line}</div>`)
      .join("");
    return `
      <div class="${classes}"${attr}>
        <div class="list-row__main">
          <div class="list-row__title">${title}</div>
          ${subtitleHtml}
        </div>
        ${meta ? `<div class="list-row__meta">${meta}</div>` : ""}
        ${actions ? `<div class="list-row__actions">${actions}</div>` : ""}
      </div>
    `;
  }

  function renderEmptyState(title, subtitle) {
    return renderListRow({
      title: escapeHtml(title),
      subtitles: [escapeHtml(subtitle)],
    });
  }

  function renderPlanRunRow(p) {
    return renderListRow({
      title: escapeHtml(p.title || p.plan?.intent || "Plan run"),
      subtitles: [escapeHtml(new Date(Number(p.createdAt || Date.now())).toLocaleString())],
      meta: `<span class="status-badge ${escapeHtml(p.status || "queued")}">${escapeHtml(p.status || "queued")}</span>`,
      interactive: true,
      onclick: `focusBlock('${escapeHtml(p.id)}')`,
    });
  }

  function renderRuntimeTaskRow(t) {
    return renderListRow({
      title: escapeHtml(t.id || "task"),
      subtitles: [
        `Workspace: ${escapeHtml(t.workspace_id || "-")} • Region: ${escapeHtml(t.requested_region || t.workspace_region || "-")}`,
        `Created: ${escapeHtml(t.created_at ? new Date(t.created_at).toLocaleString() : "-")}`,
        t.error ? `<span class="settings-error">Error: ${escapeHtml(t.error)}</span>` : "",
      ],
      meta: `<span class="status-badge ${escapeHtml(t.status || "pending")}">${escapeHtml(t.status || "pending")}</span>`,
    });
  }

  function renderSessionsList(sessions) {
    const rows = Array.isArray(sessions) ? sessions : [];
    if (!rows.length) {
      return renderEmptyState("No sessions yet", "Run an intent or command to start your first session.");
    }
    return rows.map((s, i) => renderListRow({
      title: escapeHtml(s.name),
      subtitles: [escapeHtml(s.when)],
      interactive: true,
      onclick: `loadSession(${i})`,
    })).join("");
  }

  function renderRunsList(plans, runtimeTasks, runtimeTasksLoading) {
    if (runtimeTasksLoading) return `<div class="small">Loading runs…</div>`;
    const planRows = Array.isArray(plans) ? plans : [];
    const runtimeRows = Array.isArray(runtimeTasks) ? runtimeTasks : [];
    if (planRows.length) return planRows.map(renderPlanRunRow).join("");
    if (runtimeRows.length) return runtimeRows.map(renderRuntimeTaskRow).join("");
    return renderEmptyState("No runs yet", "Switch to Agent mode to start your first run.");
  }

  function renderSavedWorkflowRow(w) {
    return renderListRow({
      title: escapeHtml(w.plan?.intent ?? "Workflow"),
      subtitles: [escapeHtml(w.key)],
      interactive: true,
      onclick: `runWorkflow('${escapeHtml(w.key)}')`,
    });
  }

  function renderWorkflowList(workflows) {
    const rows = Array.isArray(workflows) ? workflows : [];
    return rows.length
      ? rows.map(renderSavedWorkflowRow).join("")
      : renderEmptyState("No saved workflows yet", "Save a plan block to reuse it here.");
  }

  function renderSharedObjectRow(o) {
    return renderListRow({
      title: escapeHtml(o.name || "Shared object"),
      subtitles: [`${escapeHtml((o.body || "").slice(0, 140))}${(o.body || "").length > 140 ? "…" : ""}`],
      meta: `<span class="settings-value">${escapeHtml(o.kind || "snippet")}</span>`,
      actions: `
        <button onclick="insertSharedObjectInComposer('${escapeHtml(o.id)}')">Insert in composer</button>
        <button onclick="deleteSharedObject('${escapeHtml(o.id)}')">Delete</button>
      `,
    });
  }

  function renderSharedObjectList(objects) {
    const rows = Array.isArray(objects) ? objects : [];
    return rows.length
      ? rows.map(renderSharedObjectRow).join("")
      : renderEmptyState("No shared objects yet", "Save a prompt or snippet to reuse it across runs.");
  }

  function renderShareRow(s) {
    return renderListRow({
      title: escapeHtml(s.title || "(untitled)"),
      subtitles: [
        `<code>${escapeHtml(s.id)}</code>`,
        `Role: ${escapeHtml(s.requiredRole || "viewer")} • Expires: ${escapeHtml(s.expiresAt || "n/a")} • By: ${escapeHtml(s.createdBy || "unknown")}`,
      ],
      actions: `
        <button onclick="openShareDetails('${escapeHtml(s.id)}')">Open</button>
        <button onclick="navigator.clipboard.writeText('${escapeHtml(s.id)}')">Copy ID</button>
        <button ${s.revoked ? "disabled" : ""} onclick="revokeShareById('${escapeHtml(s.id)}')">Revoke</button>
      `,
    });
  }

  function renderSharesList(shares) {
    return (Array.isArray(shares) ? shares : []).slice(0, 50).map(renderShareRow).join("");
  }

  function renderTeamMemberRow(member, currentUser) {
    const email = String(member.email || "");
    const role = String(member.role || "viewer");
    const safe = escapeHtml(email).replace(/[^a-z0-9]/gi, "_");
    return renderListRow({
      title: `${escapeHtml(email)}${email === currentUser ? ' <span class="settings-value">current</span>' : ""}`,
      subtitles: [`Role: ${escapeHtml(role)}`],
      actions: `
        <select id="teamRole_${safe}">
          <option value="viewer" ${role === "viewer" ? "selected" : ""}>viewer</option>
          <option value="operator" ${role === "operator" ? "selected" : ""}>operator</option>
          <option value="owner" ${role === "owner" ? "selected" : ""}>owner</option>
        </select>
        <button onclick="setTeamMemberRole(decodeURIComponent('${encodeURIComponent(email)}'))">Set role</button>
        <button ${email === currentUser ? "disabled" : ""} onclick="removeTeamMember(decodeURIComponent('${encodeURIComponent(email)}'))">Remove</button>
      `,
    });
  }

  function renderTeamList(members, currentUser) {
    return (Array.isArray(members) ? members : []).map((member) => renderTeamMemberRow(member, currentUser)).join("");
  }

  function renderTeamInviteRow(inv) {
    return renderListRow({
      title: `${escapeHtml(inv.email || "unknown")} <span class="settings-value">${escapeHtml(inv.role || "viewer")}</span>`,
      subtitles: [`status: ${escapeHtml(inv.status || "pending")} • expires: ${escapeHtml(inv.expiresAt || "")}`],
      actions: `
        <button onclick="copyInviteCodePrompt('${escapeHtml(inv.id)}')">Copy code</button>
        <button ${inv.status !== "pending" ? "disabled" : ""} onclick="revokeTeamInvite('${escapeHtml(inv.id)}')">Revoke</button>
      `,
    });
  }

  function renderTeamInviteList(invites) {
    return (Array.isArray(invites) ? invites : []).slice(0, 40).map(renderTeamInviteRow).join("");
  }

  function renderTeamActivityRow(evt) {
    return renderListRow({
      title: `${escapeHtml(evt.action || "event")} • ${escapeHtml(evt.target || "")}`,
      subtitles: [`${escapeHtml(evt.timestamp || "")} • ${escapeHtml(evt.actor || "unknown")} (${escapeHtml(evt.actorRole || "viewer")})`],
      compact: true,
    });
  }

  function renderTeamActivityList(events) {
    return (Array.isArray(events) ? events : []).map(renderTeamActivityRow).join("");
  }

  function workflowIssueTasks(tasks) {
    return (Array.isArray(tasks) ? tasks : []).filter((t) => String(t?.payload?.mode || "") === "issue_to_pr");
  }

  function workflowMonitorSummary({ nodes = [], edges = [], issueTasks = [], audit = [], auditError = "" } = {}) {
    const queued = issueTasks.filter((t) => t.status === "queued").length;
    const running = issueTasks.filter((t) => t.status === "running").length;
    const failed = issueTasks.filter((t) => t.status === "failed").length;
    const completed = issueTasks.filter((t) => t.status === "completed").length;
    const acceptedWebhook = audit.filter((e) => String(e?.outcome || "") === "accepted").length;
    const rejectedWebhook = audit.filter((e) => String(e?.outcome || "") === "rejected").length;
    const latestWebhook = audit[0] || null;
    const latestWebhookMeta = latestWebhook
      ? ` • latest webhook: ${String(latestWebhook.eventName || latestWebhook.event || "unknown")} (${String(latestWebhook.outcome || "unknown")})`
      : "";
    const auditErrorMeta = auditError ? ` • webhook audit: ${auditError}` : "";
    return (
      `Graph: ${nodes.length} node(s), ${edges.length} edge(s) • ` +
      `Issue workflows: ${issueTasks.length} • ` +
      `queued ${queued}, running ${running}, completed ${completed}, failed ${failed} • ` +
      `webhooks accepted ${acceptedWebhook}, rejected ${rejectedWebhook}${latestWebhookMeta}${auditErrorMeta}`
    );
  }

  function renderWorkflowIssueTaskRow(task, nodes) {
    const issueId = String(task?.payload?.issueId || "unknown");
    const branch = String(task?.payload?.branchName || "—");
    const status = String(task?.status || "unknown");
    const workflowId = String(task?.payload?.workflowId || "").trim();
    const wfNode = workflowId ? nodes.find((n) => String(n?.id || "") === `workflow_${workflowId}`) : null;
    const wfState = String(wfNode?.data?.state || "unknown");
    const prNode = workflowId ? nodes.find((n) => String(n?.id || "") === `pr_${workflowId}`) : null;
    const prState = String(prNode?.data?.status || (task?.payload?.prDryRun === false ? "live_pending" : "dry_run_pending"));
    const badgeClass = status === "completed" ? "diag-badge ok" : status === "failed" ? "diag-badge warn" : "pill";
    const prMode = task?.payload?.prDryRun === false ? "live" : "dry-run";
    const taskId = escapeHtml(String(task.id || ""));
    return renderListRow({
      title: `Issue ${escapeHtml(issueId)}`,
      subtitles: [
        `Task: ${escapeHtml(String(task.id || "—"))}`,
        `Workflow: ${escapeHtml(workflowId || "—")} • State: ${escapeHtml(wfState)}`,
        `Branch: ${escapeHtml(branch)} • PR mode: ${escapeHtml(prMode)} • PR state: ${escapeHtml(prState)}`,
        `Command: <code>${escapeHtml(String(task?.payload?.command || "—"))}</code>`,
      ],
      meta: `<span class="${badgeClass}">${escapeHtml(status)}</span>`,
      actions: `
        <button onclick="openWorkflowBranch('${taskId}')">Open branch</button>
        <button onclick="retryWorkflowTask('${taskId}')">Retry failed</button>
        <button onclick="createPrForWorkflow('${taskId}')">Create PR now</button>
        <button onclick="markWorkflowCiPassed('${taskId}')">CI passed</button>
        <button onclick="markWorkflowCiFailed('${taskId}')">CI failed + auto-retry</button>
        <button onclick="addWorkflowReviewComment('${taskId}')">Add review feedback</button>
        <button onclick="markWorkflowPrMerged('${taskId}')">PR merged</button>
        <button onclick="markWorkflowPrClosed('${taskId}')">PR closed</button>
      `,
    });
  }

  function renderWorkflowIssueTaskList(issueTasks, nodes) {
    const rows = Array.isArray(issueTasks) ? issueTasks : [];
    if (!rows.length) return `<div class="small">No issue workflows yet.</div>`;
    return rows.slice(0, 12).map((task) => renderWorkflowIssueTaskRow(task, nodes || [])).join("");
  }

  function renderWorkflowWebhookAuditList(audit, auditError) {
    if (auditError) return `<div class="small">${escapeHtml(auditError)}</div>`;
    const rows = Array.isArray(audit) ? audit : [];
    if (!rows.length) return `<div class="small">No webhook audit events yet.</div>`;
    return `
      <div class="small"><b>Recent Webhook Events</b></div>
      ${rows.slice(0, 10).map((event) => {
        const outcome = String(event?.outcome || "unknown");
        const mapped = String(event?.mapped || event?.reason || "n/a");
        const eventName = String(event?.eventName || event?.event || "unknown");
        const workflowId = String(event?.workflowId || "—");
        const ts = String(event?.ts || "").slice(11, 19) || "—";
        const cls = outcome === "accepted" ? "diag-badge ok" : outcome === "rejected" ? "diag-badge warn" : "pill";
        return renderListRow({
          title: "",
          subtitles: [
            `<b>${escapeHtml(eventName)}</b> • ${escapeHtml(mapped)}`,
            `workflow: ${escapeHtml(workflowId)} • ${escapeHtml(ts)} UTC`,
          ],
          meta: `<span class="${cls}">${escapeHtml(outcome)}</span>`,
          compact: true,
        });
      }).join("")}
    `;
  }

  window.RinaRendererDrawer = {
    renderListRow,
    renderEmptyState,
    renderEmptyListRow: renderEmptyState,
    renderPlanRunRow,
    renderRuntimeTaskRow,
    renderSessionsList,
    renderRunsList,
    renderSavedWorkflowRow,
    renderWorkflowList,
    renderSharedObjectRow,
    renderSharedObjectList,
    renderSharesList,
    renderTeamList,
    renderTeamInviteList,
    renderTeamActivityList,
    workflowIssueTasks,
    workflowMonitorSummary,
    renderWorkflowIssueTaskList,
    renderWorkflowWebhookAuditList,
  };
})();
