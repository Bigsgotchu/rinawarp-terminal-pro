(function () {
  'use strict';

  function getBlockById(blockId) {
    return blocks.find((block) => block.id === blockId) || null;
  }

  function addBlockState(block) {
    blocks.push(block);
    renderBlocks();
    persistUiSnapshot();
  }

  function appendBlockState(block) {
    blocks.push(block);
    renderBlocks();
  }

  function removeBlockState(blockId) {
    const idx = blocks.findIndex((block) => block.id === blockId);
    if (idx !== -1) {
      blocks.splice(idx, 1);
      renderBlocks();
      persistUiSnapshot();
    }
  }

  function updateBlockState(blockId, updates) {
    const idx = blocks.findIndex((block) => block.id === blockId);
    if (idx !== -1) {
      blocks[idx] = { ...blocks[idx], ...updates };
      renderBlocks();
      persistUiSnapshot();
    }
  }

  function mapStreamToBlock(streamId, blockId) {
    if (!streamId || !blockId) return;
    streamToBlock[streamId] = blockId;
  }

  function getBlockIdForStream(streamId) {
    return streamToBlock[streamId] || null;
  }

  function mapStreamToPlanBlock(streamId, planBlockId) {
    if (!streamId || !planBlockId) return;
    streamToPlanBlock[streamId] = planBlockId;
  }

  function clearStreamMapping(streamId) {
    delete streamToBlock[streamId];
    delete streamToPlanBlock[streamId];
  }

  function mapPlanRun(planRunId, planBlockId, meta = {}) {
    if (!planRunId || !planBlockId) return;
    planRunToPlanBlock[planRunId] = planBlockId;
    planRunMeta[planRunId] = meta;
  }

  function getPlanBlockIdForRun(planRunId) {
    return planRunToPlanBlock[planRunId] || null;
  }

  function getPlanRunMeta(planRunId) {
    return planRunMeta[planRunId] || null;
  }

  function clearPlanRunMapping(planRunId) {
    delete planRunToPlanBlock[planRunId];
    delete planRunMeta[planRunId];
  }

  function getActivePlanRunIdForBlock(blockId) {
    for (const [planRunId, mappedBlockId] of Object.entries(planRunToPlanBlock)) {
      if (mappedBlockId === blockId) return planRunId;
    }
    return null;
  }

  function setAutoRepairRetry(blockId, retriesLeft) {
    autoRepairStateByPlanBlock[blockId] = { retriesLeft };
  }

  function getAutoRepairState(blockId) {
    return autoRepairStateByPlanBlock[blockId] || null;
  }

  function consumeAutoRepairRetry(blockId) {
    const state = autoRepairStateByPlanBlock[blockId];
    if (!state || Number(state.retriesLeft || 0) <= 0) return false;
    state.retriesLeft -= 1;
    if (state.retriesLeft <= 0) delete autoRepairStateByPlanBlock[blockId];
    return true;
  }

  function toggleBlockCollapsed(blockId) {
    blockCollapsed[blockId] = !blockCollapsed[blockId];
    renderBlocks();
    persistUiSnapshot();
  }

  function clearRunningStreamLocally(streamId, opts = {}) {
    const blockId = getBlockIdForStream(streamId);
    if (!blockId) return false;
    const block = getBlockById(blockId);
    if (!block) {
      clearStreamMapping(streamId);
      return false;
    }
    if (block.status === "running") {
      block.status = opts.status || "cancelled";
    }
    const note = String(opts.note || "").trim();
    if (note) {
      block.stderr = `${block.stderr || ""}${note}\n`;
    }
    clearStreamMapping(streamId);
    return true;
  }

  window.RinaWarpStreamStateController = {
    getBlockById,
    addBlockState,
    appendBlockState,
    removeBlockState,
    updateBlockState,
    mapStreamToBlock,
    getBlockIdForStream,
    mapStreamToPlanBlock,
    clearStreamMapping,
    mapPlanRun,
    getPlanBlockIdForRun,
    getPlanRunMeta,
    clearPlanRunMapping,
    getActivePlanRunIdForBlock,
    setAutoRepairRetry,
    getAutoRepairState,
    consumeAutoRepairRetry,
    toggleBlockCollapsed,
    clearRunningStreamLocally,
  };
})();
