(function () {
  'use strict';

  function setPtyStatusText(text) {
    const status = document.getElementById("ptyStatus");
    if (status) status.textContent = text;
  }

  function markPtyReady() {
    ptyConnected = true;
    setPtyStatusText("Terminal ready");
    updatePrimaryRunStatus();
  }

  function markPtyOffline() {
    ptyConnected = false;
    setPtyStatusText("Terminal offline");
    updatePrimaryRunStatus();
  }

  window.RinaWarpTerminalStateController = {
    setPtyStatusText,
    markPtyReady,
    markPtyOffline,
  };
})();
