(function () {
  'use strict';

  function renderBlocks() {
    const now = Date.now();
    if (now - _lastRender < RENDER_THROTTLE) {
      requestAnimationFrame(renderBlocks);
      return;
    }
    _lastRender = now;
    renderBlocksImpl();
  }

  function renderBlocksImpl() {
    const timeline = document.getElementById("timeline");
    timeline.innerHTML = renderConversationStream(blocks, { blockCollapsed });

    timeline.scrollTop = timeline.scrollHeight;
    updateTerminalTimelineVisibility();
    renderChatThread();
    updatePrimaryRunStatus();
  }

  window.RinaWarpRenderLoopController = {
    renderBlocks,
    renderBlocksImpl,
  };
})();
