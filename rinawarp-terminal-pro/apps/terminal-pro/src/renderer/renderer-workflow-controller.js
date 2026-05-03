(function () {
  'use strict';

  function renderWorkflowMonitorPanel() {
    const summaryEl = document.getElementById("workflowMonitorSummary");
    const listEl = document.getElementById("workflowMonitorList");
    const auditEl = document.getElementById("workflowMonitorAuditList");
    if (!summaryEl || !listEl || !auditEl) return;

    const nodes = Array.isArray(workflowGraphCache?.nodes) ? workflowGraphCache.nodes : [];
    const edges = Array.isArray(workflowGraphCache?.edges) ? workflowGraphCache.edges : [];
    const tasks = Array.isArray(workflowTasksCache) ? workflowTasksCache : [];
    const audit = Array.isArray(workflowWebhookAuditCache) ? workflowWebhookAuditCache : [];
    const issueTasks = workflowIssueTasks(tasks);
    summaryEl.textContent = workflowMonitorSummary({ nodes, edges, issueTasks, audit, auditError: workflowWebhookAuditError });
    listEl.innerHTML = renderWorkflowIssueTaskList(issueTasks, nodes);
    auditEl.innerHTML = renderWorkflowWebhookAuditList(audit, workflowWebhookAuditError);
  }

  async function refreshWorkflowPanel() {
    if (workflowLoading) return;
    workflowLoading = true;
    try {
      const graphRes = window.rina?.orchestratorGraph ? await window.rina.orchestratorGraph() : { ok: false };
      if (graphRes?.ok) {
        workflowGraphCache = graphRes.graph || { nodes: [], edges: [] };
      }
      const tasksRes = await daemonTasks() || { ok: false, tasks: [] };
      workflowTasksCache = Array.isArray(tasksRes?.tasks) ? tasksRes.tasks : [];
      const auditRes = window.rina?.orchestratorWebhookAudit
        ? await window.rina.orchestratorWebhookAudit({
            limit: 30,
            outcome: workflowWebhookOutcomeFilter || undefined,
            mapped: workflowWebhookMappedFilter || undefined,
          })
        : { ok: false, entries: [] };
      workflowWebhookAuditCache = Array.isArray(auditRes?.entries) ? auditRes.entries : [];
      workflowWebhookAuditError = auditRes?.ok ? "" : String(auditRes?.error || "Webhook audit unavailable.");
    } catch {
      // keep previous cache on transient fetch errors
      workflowWebhookAuditError = "Webhook audit unavailable.";
    } finally {
      workflowLoading = false;
    }
    renderWorkflowMonitorPanel();
  }

  async function onWorkflowWebhookFilterChange() {
    const outcome = document.getElementById("workflowWebhookOutcomeFilter");
    const mapped = document.getElementById("workflowWebhookMappedFilter");
    workflowWebhookOutcomeFilter = outcome ? String(outcome.value || "") : "";
    workflowWebhookMappedFilter = mapped ? String(mapped.value || "") : "";
    await refreshWorkflowPanel();
  }

  function startWorkflowPolling() {
    if (workflowPollTimer) clearInterval(workflowPollTimer);
    workflowPollTimer = setInterval(() => {
      if (activeSidebarTab !== "workflows") return;
      void refreshWorkflowPanel();
    }, 3000);
  }

  function findWorkflowTask(taskId) {
    const tasks = Array.isArray(workflowTasksCache) ? workflowTasksCache : [];
    return tasks.find((t) => String(t?.id || "") === String(taskId || "")) || null;
  }

  async function openWorkflowBranch(taskId) {
    try {
      const task = findWorkflowTask(taskId);
      if (!task) {
        toast("Workflow task not found");
        return;
      }
      const payload = task.payload || {};
      if (!window.rina?.orchestratorPrepareBranch) {
        toast("Branch API unavailable");
        return;
      }
      const res = await window.rina.orchestratorPrepareBranch({
        repoPath: String(payload.cwd || ""),
        issueId: String(payload.issueId || ""),
        branchName: String(payload.branchName || ""),
      });
      if (!res?.ok) {
        toast(`Open branch failed: ${res?.error || "unknown error"}`);
        return;
      }
      toast(`Checked out ${res.after || payload.branchName || "branch"}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || "failed");
      toast(`Open branch failed: ${msg}`);
    }
  }

  async function retryWorkflowTask(taskId) {
    try {
      const task = findWorkflowTask(taskId);
      if (!task) {
        toast("Workflow task not found");
        return;
      }
      const payload = task.payload || {};
      if (!window.rina?.orchestratorIssueToPr) {
        toast("Orchestrator API unavailable");
        return;
      }
      const res = await window.rina.orchestratorIssueToPr({
        issueId: String(payload.issueId || ""),
        repoPath: String(payload.cwd || ""),
        branchName: payload.branchName ? String(payload.branchName) : undefined,
        command: payload.command ? String(payload.command) : undefined,
        repoSlug: payload.repoSlug ? String(payload.repoSlug) : undefined,
        push: payload.push === true,
        prDryRun: payload.prDryRun !== false,
        baseBranch: payload.baseBranch ? String(payload.baseBranch) : undefined,
        prTitle: payload.prTitle ? String(payload.prTitle) : undefined,
        prBody: payload.prBody ? String(payload.prBody) : undefined,
        commitMessage: payload.commitMessage ? String(payload.commitMessage) : undefined,
      });
      if (!res?.ok) {
        toast(`Retry failed: ${res?.error || "unknown error"}`);
        return;
      }
      toast(`Retry queued: ${res.taskId}`);
      await refreshWorkflowPanel();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || "failed");
      toast(`Retry failed: ${msg}`);
    }
  }

  // --- Shared Objects & Workflow Templates ---
  function listWorkflows() {
    return workflowTemplatesCache || [];
  }

  function listSharedObjects() {
    return sharedObjectsCache || [];
  }

  async function refreshSharedObjects() {
    try {
      // Load from localStorage as temporary storage
      const stored = localStorage.getItem("rinawarp_shared_objects");
      sharedObjectsCache = stored ? JSON.parse(stored) : [];
      const storedWorkflows = localStorage.getItem("rinawarp_workflow_templates");
      workflowTemplatesCache = storedWorkflows ? JSON.parse(storedWorkflows) : [];
    } catch {
      sharedObjectsCache = [];
      workflowTemplatesCache = [];
    }
  }

  function saveSharedObjectFromInputs() {
    const name = document.getElementById("sharedObjectName");
    const kind = document.getElementById("sharedObjectKind");
    const body = document.getElementById("sharedObjectBody");
    const objName = name ? String(name.value || "").trim() : "";
    const objKind = kind ? String(kind.value || "prompt") : "prompt";
    const objBody = body ? String(body.value || "").trim() : "";
    if (!objName || !objBody) {
      toast("Name and body are required");
      return;
    }
    const obj = { id: "obj_" + Date.now(), name: objName, kind: objKind, body: objBody, createdAt: new Date().toISOString() };
    sharedObjectsCache = [...(sharedObjectsCache || []), obj];
    localStorage.setItem("rinawarp_shared_objects", JSON.stringify(sharedObjectsCache));
    toast("Object saved");
    if (name) name.value = "";
    if (body) body.value = "";
    // Refresh the panel
    const tabBtn = document.querySelector('.sidebar-tab[data-tab="workflows"]');
    if (tabBtn) tabBtn.click();
  }

  function saveSharedObjectFromComposer() {
    const nameInput = document.getElementById("sharedObjectName");
    const kind = document.getElementById("sharedObjectKind");
    const objName = nameInput ? String(nameInput.value || "").trim() : "";
    const objKind = kind ? String(kind.value || "prompt") : "prompt";
    const composer = document.getElementById("composerInput");
    const composerText = composer ? String(composer.value || "").trim() : "";
    if (!objName) {
      toast("Name is required");
      return;
    }
    if (!composerText) {
      toast("Composer is empty");
      return;
    }
    const obj = { id: "obj_" + Date.now(), name: objName, kind: objKind, body: composerText, createdAt: new Date().toISOString() };
    sharedObjectsCache = [...(sharedObjectsCache || []), obj];
    localStorage.setItem("rinawarp_shared_objects", JSON.stringify(sharedObjectsCache));
    toast("Object saved from composer");
    if (nameInput) nameInput.value = "";
    // Refresh the panel
    const tabBtn = document.querySelector('.sidebar-tab[data-tab="workflows"]');
    if (tabBtn) tabBtn.click();
  }

  function insertSharedObjectInComposer(objId) {
    const obj = (sharedObjectsCache || []).find((o) => String(o.id) === String(objId));
    if (!obj) {
      toast("Object not found");
      return;
    }
    const composer = document.getElementById("composerInput");
    if (!composer) {
      toast("Composer not available");
      return;
    }
    const existing = String(composer.value || "");
    composer.value = existing + (existing ? "\n" : "") + (obj.body || "");
    composer.focus();
    toast("Object inserted in composer");
  }

  function deleteSharedObject(objId) {
    if (!confirm("Delete this object?")) return;
    sharedObjectsCache = (sharedObjectsCache || []).filter((o) => String(o.id) !== String(objId));
    localStorage.setItem("rinawarp_shared_objects", JSON.stringify(sharedObjectsCache));
    toast("Object deleted");
    // Refresh the panel
    const tabBtn = document.querySelector('.sidebar-tab[data-tab="workflows"]');
    if (tabBtn) tabBtn.click();
  }

  function runWorkflow(key) {
    const wf = (workflowTemplatesCache || []).find((w) => String(w.key) === String(key));
    if (!wf) {
      toast("Workflow not found");
      return;
    }
    // Load workflow into composer
    const composer = document.getElementById("composerInput");
    if (composer && wf.plan && wf.plan.intent) {
      composer.value = wf.plan.intent;
      composer.focus();
      toast("Workflow loaded in composer");
    } else {
      toast("Could not load workflow");
    }
  }

  // --- Runtime Tasks (Background Runs) ---
  async function refreshRuntimeTasks() {
    if (runtimeTasksLoading) return;
    runtimeTasksLoading = true;
    try {
      if (!window.rina?.runtimeTasks) {
        runtimeTasksCache = [];
        return;
      }
      const res = await runtimeTasks();
      runtimeTasksCache = Array.isArray(res?.tasks) ? res.tasks : [];
    } catch {
      runtimeTasksCache = [];
    } finally {
      runtimeTasksLoading = false;
    }
  }

  function renderRuntimeTasksPanel() {
    const container = document.getElementById("runtimeTasksList");
    if (!container) return;
    if (runtimeTasksLoading) {
      container.innerHTML = `<div class="small">Loading runs…</div>`;
      return;
    }
    if (!runtimeTasksCache.length) {
      container.innerHTML = renderEmptyListRow("No background runs yet", "Queued backend work will appear here.");
      return;
    }
    container.innerHTML = runtimeTasksCache.map(renderRuntimeTaskRow).join("");
  }

  async function createPrForWorkflow(taskId) {
    try {
      const task = findWorkflowTask(taskId);
      if (!task) {
        toast("Workflow task not found");
        return;
      }
      const payload = task.payload || {};
      if (!window.rina?.orchestratorCreatePr) {
        toast("PR API unavailable");
        return;
      }
      const repoSlug = String(payload.repoSlug || "").trim();
      const branchName = String(payload.branchName || "").trim();
      if (!repoSlug || !branchName) {
        toast("Missing repo slug or branch name");
        return;
      }
      const live = confirm("Create live PR now? Cancel = dry-run preview.");
      const res = await window.rina.orchestratorCreatePr({
        repoSlug,
        head: branchName,
        base: String(payload.baseBranch || "main"),
        title: String(payload.prTitle || `Fix issue ${String(payload.issueId || "")}`),
        body: String(payload.prBody || ""),
        draft: false,
        dryRun: !live,
        workflowId: String(payload.workflowId || ""),
        issueId: String(payload.issueId || ""),
        branchName,
      });
      if (!res?.ok) {
        toast(`Create PR failed: ${res?.error || "unknown error"}`);
        return;
      }
      if (res.mode === "dry_run") {
        toast("PR dry-run payload generated");
        await refreshWorkflowPanel();
        return;
      }
      toast(`PR created: #${res.number}`);
      await refreshWorkflowPanel();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || "failed");
      toast(`Create PR failed: ${msg}`);
    }
  }

  async function markWorkflowCiPassed(taskId) {
    try {
      const task = findWorkflowTask(taskId);
      if (!task) {
        toast("Workflow task not found");
        return;
      }
      if (!window.rina?.orchestratorCiStatus) {
        toast("CI status API unavailable");
        return;
      }
      const payload = task.payload || {};
      const workflowId = String(payload.workflowId || "").trim();
      if (!workflowId) {
        toast("Task missing workflowId");
        return;
      }
      const res = await window.rina.orchestratorCiStatus({
        workflowId,
        provider: "manual",
        status: "passed",
        url: "",
      });
      if (!res?.ok) {
        toast(`CI status update failed: ${res?.error || "unknown error"}`);
        return;
      }
      toast("CI pass recorded");
      await refreshWorkflowPanel();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || "failed");
      toast(`CI update failed: ${msg}`);
    }
  }

  async function markWorkflowCiFailed(taskId) {
    try {
      const task = findWorkflowTask(taskId);
      if (!task) {
        toast("Workflow task not found");
        return;
      }
      if (!window.rina?.orchestratorCiStatus) {
        toast("CI status API unavailable");
        return;
      }
      const payload = task.payload || {};
      const workflowId = String(payload.workflowId || "").trim();
      if (!workflowId) {
        toast("Task missing workflowId");
        return;
      }
      const res = await window.rina.orchestratorCiStatus({
        workflowId,
        provider: "manual",
        status: "failed",
        url: "",
        autoRetry: true,
        repoPath: String(payload.cwd || ""),
        issueId: String(payload.issueId || ""),
        branchName: String(payload.branchName || ""),
        command: String(payload.command || "npm test"),
        repoSlug: payload.repoSlug ? String(payload.repoSlug) : undefined,
        baseBranch: payload.baseBranch ? String(payload.baseBranch) : "main",
        prDryRun: payload.prDryRun !== false,
      });
      if (!res?.ok) {
        toast(`CI status update failed: ${res?.error || "unknown error"}`);
        return;
      }
      if (res?.autoRevision?.taskId) {
        toast(`Auto-retry queued: ${res.autoRevision.taskId}`);
      } else {
        toast("CI failure recorded");
      }
      await refreshWorkflowPanel();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || "failed");
      toast(`CI update failed: ${msg}`);
    }
  }

  async function addWorkflowReviewComment(taskId) {
    try {
      const task = findWorkflowTask(taskId);
      if (!task) {
        toast("Workflow task not found");
        return;
      }
      if (!window.rina?.orchestratorReviewComment) {
        toast("Review API unavailable");
        return;
      }
      const payload = task.payload || {};
      const workflowId = String(payload.workflowId || "").trim();
      const comment = (prompt("Review feedback to apply:", "Please adjust implementation based on review notes.") || "").trim();
      if (!comment) {
        toast("Review feedback cancelled");
        return;
      }
      const res = await window.rina.orchestratorReviewComment({
        workflowId,
        repoPath: String(payload.cwd || ""),
        issueId: String(payload.issueId || ""),
        branchName: String(payload.branchName || ""),
        comment,
        command: String(payload.command || "npm test"),
        repoSlug: payload.repoSlug ? String(payload.repoSlug) : undefined,
        baseBranch: payload.baseBranch ? String(payload.baseBranch) : "main",
        prDryRun: payload.prDryRun !== false,
      });
      if (!res?.ok) {
        toast(`Review queue failed: ${res?.error || "unknown error"}`);
        return;
      }
      toast(`Review revision queued: ${res.taskId}`);
      await refreshWorkflowPanel();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || "failed");
      toast(`Review queue failed: ${msg}`);
    }
  }

  async function markWorkflowPrStatus(taskId, status) {
    try {
      const task = findWorkflowTask(taskId);
      if (!task) {
        toast("Workflow task not found");
        return;
      }
      if (!window.rina?.orchestratorPrStatus) {
        toast("PR status API unavailable");
        return;
      }
      const payload = task.payload || {};
      const workflowId = String(payload.workflowId || "").trim();
      if (!workflowId) {
        toast("Task missing workflowId");
        return;
      }
      const res = await window.rina.orchestratorPrStatus({
        workflowId,
        status,
        issueId: String(payload.issueId || ""),
        branchName: String(payload.branchName || ""),
        repoSlug: payload.repoSlug ? String(payload.repoSlug) : undefined,
      });
      if (!res?.ok) {
        toast(`PR status update failed: ${res?.error || "unknown error"}`);
        return;
      }
      toast(`PR status set to ${status}`);
      await refreshWorkflowPanel();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || "failed");
      toast(`PR status update failed: ${msg}`);
    }
  }

  async function markWorkflowPrMerged(taskId) {
    return markWorkflowPrStatus(taskId, "merged");
  }

  async function markWorkflowPrClosed(taskId) {
    return markWorkflowPrStatus(taskId, "closed");
  }

  function persistWorkflow(plan) {
    const id = plan.id || crypto.randomUUID();
    const name = (plan.intent || "workflow").slice(0, 80);
    const key = `rinawarp:workflow:${name}:${id}`;
    localStorage.setItem(key, JSON.stringify(plan));
    return { key, name, id };
  }

  function listWorkflows() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith("rinawarp:workflow:")) continue;
      try { out.push({ key: k, plan: JSON.parse(localStorage.getItem(k) || "null") }); } catch {}
    }
    return out;
  }

  function saveWorkflowFromPlanBlock(blockId) {
    const block = blocks.find(b => b.id === blockId);
    if (!block?.plan) return;
    const saved = persistWorkflow(block.plan);
    toast(`Saved workflow: ${saved.name}`);
    setSidebarTab("workflows");
  }

  function runWorkflow(key) {
    const plan = JSON.parse(localStorage.getItem(key) || "null");
    if (!plan) {
      toast("Workflow not found");
      return;
    }
    const blockId = newId("plan");
    addBlock({
      id: blockId,
      type: "plan",
      status: "queued",
      createdAt: Date.now(),
      title: `Workflow: ${plan.intent || "saved"}`,
      markdown: `${plan.reasoning || ""}\n\nSteps:\n${(plan.steps || []).map(s =>
        `- ${s.stepId ?? ""} \`${(s.input?.command ?? "").replaceAll("`","")}\``
      ).join("\n")}`,
      plan
    });
    toast("Workflow loaded as plan");
  }

  window.RinaWarpWorkflowController = {
    renderWorkflowMonitorPanel,
    refreshWorkflowPanel,
    onWorkflowWebhookFilterChange,
    startWorkflowPolling,
    findWorkflowTask,
    openWorkflowBranch,
    retryWorkflowTask,
    listWorkflows,
    listSharedObjects,
    refreshSharedObjects,
    saveSharedObjectFromInputs,
    saveSharedObjectFromComposer,
    insertSharedObjectInComposer,
    deleteSharedObject,
    runWorkflow,
    refreshRuntimeTasks,
    renderRuntimeTasksPanel,
    createPrForWorkflow,
    markWorkflowCiPassed,
    markWorkflowCiFailed,
    addWorkflowReviewComment,
    markWorkflowPrStatus,
    markWorkflowPrMerged,
    markWorkflowPrClosed,
    persistWorkflow,
    saveWorkflowFromPlanBlock,
  };
  Object.assign(window, window.RinaWarpWorkflowController);
})();
