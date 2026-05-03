(function () {
  function api() {
    return window.rina || window.rinaWarp || {};
  }

  function getRinaUsageStatus() {
    return api().getRinaUsageStatus?.();
  }

  async function approveInlineCommand(payload) {
    if (!api().inlineApprove) return { ok: false, error: "Inline approve unavailable" };
    return api().inlineApprove({ ...payload, approvalKind: "command" });
  }

  async function approveFilePatch(payload) {
    if (!api().inlineApprove) return { ok: false, error: "Inline approve unavailable" };
    return api().inlineApprove({ ...payload, approvalKind: "file_patch" });
  }

  function inlineAsk(payload) {
    return api().inlineAsk?.(payload);
  }

  function sendChatMessage(text, projectRoot) {
    return api().chatSend?.(text, projectRoot);
  }

  async function loadDiagnostics() {
    if (!api().diagnosticsPaths) throw new Error("diagnostics API unavailable");
    const [diagnostics, daemon] = await Promise.all([
      api().diagnosticsPaths(),
      api().daemonStatus ? api().daemonStatus() : Promise.resolve({ ok: false, error: "daemon API unavailable" }),
    ]);
    const taskResp = api().daemonTasks ? await api().daemonTasks() : null;
    return {
      diagnostics,
      daemon,
      daemonTasks: Array.isArray(taskResp?.tasks) ? taskResp.tasks : [],
    };
  }

  function openDirectory() {
    return api().openDirectory?.();
  }

  function workspaceDefault() {
    return api().workspaceDefault?.();
  }

  function listShares() {
    return api().listShares?.();
  }

  function revokeShare(id) {
    return api().revokeShare?.(id);
  }

  function teamGet() {
    return api().teamGet?.();
  }

  function teamListInvites(args) {
    return api().teamListInvites?.(args);
  }

  function teamActivity(args) {
    return api().teamActivity?.(args);
  }

  function inlineRunsList(filters) {
    return api().inlineRunsList?.(filters);
  }

  function inlineRunsExport(payload) {
    return api().inlineRunsExport?.(payload);
  }

  function daemonTaskAdd(payload) {
    return api().daemonTaskAdd?.(payload);
  }

  function daemonTasks(args) {
    return api().daemonTasks?.(args);
  }

  function daemonStart() {
    return api().daemonStart?.();
  }

  function daemonStop() {
    return api().daemonStop?.();
  }

  function redactionPreview(text) {
    return api().redactionPreview?.(text);
  }

  function runtimeTasks() {
    return api().runtimeTasks?.();
  }

  window.RinaRendererIpc = {
    getRinaUsageStatus,
    approveInlineCommand,
    approveFilePatch,
    inlineAsk,
    sendChatMessage,
    loadDiagnostics,
    openDirectory,
    workspaceDefault,
    listShares,
    revokeShare,
    teamGet,
    teamListInvites,
    teamActivity,
    inlineRunsList,
    inlineRunsExport,
    daemonTaskAdd,
    daemonTasks,
    daemonStart,
    daemonStop,
    redactionPreview,
    runtimeTasks,
  };
})();
