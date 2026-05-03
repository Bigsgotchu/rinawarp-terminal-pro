(function () {
  'use strict';

  function summarizePlanRuns() {
    const plans = blocks
      .filter((b) => b.type === "plan")
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    const running = plans.filter((p) => p.status === "running");
    const failed = plans.filter((p) => p.status === "failed");
    const completed = plans.filter((p) => p.status === "done");
    return { plans, running, failed, completed };
  }

  function focusBlock(blockId) {
    if (!blockId) return;
    const el = document.querySelector(`.block[data-id="${blockId}"]`);
    if (!el) {
      toast("Run block not found in timeline");
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("pulse");
    setTimeout(() => el.classList.remove("pulse"), 900);
  }

  function setSidebarTab(tab) {
    const settingsAlias = {
      runs: "runs",
      structured: "structured",
      workflows: "workflows",
      settings: currentSettingsTab || "general",
      about: "about",
    };
    const requestedTab = tab;
    const settingsTargetTab = settingsAlias[requestedTab] || null;
    activeSidebarTab = settingsTargetTab ? "settings" : requestedTab;
    const tabs = document.querySelectorAll(".tabbar .tab");
    tabs.forEach((el) => {
      const isActive = el.getAttribute("data-tab") === activeSidebarTab;
      el.classList.toggle("active", isActive);
      el.setAttribute("aria-selected", String(isActive));
      el.tabIndex = isActive ? 0 : -1;
    });

    const title = document.getElementById("paneTitle");
    const meta = document.getElementById("paneMeta");
    const body = document.getElementById("paneBody");

    if (!title || !meta || !body) return;
    body.setAttribute("data-testid", `panel-${activeSidebarTab}`);

    if (activeSidebarTab === "sessions") {
      updatePrimaryNav("sessions");
      title.textContent = "Sessions";
      meta.textContent = String(sessions.length);
      body.innerHTML = renderSessionsList(sessions);
      return;
    }

    if (requestedTab === "runs" && !settingsTargetTab) {
      void refreshRuntimeTasks();
      const run = summarizePlanRuns();
      const rt = runtimeTasksCache || [];
      const rtRunning = rt.filter((t) => t.status === "running" || t.status === "pending").length;
      title.textContent = "Runs";
      meta.textContent = `${run.running.length} active / ${rtRunning} background`;
      body.innerHTML = `
        <div class="item">
          <div><b>Run Overview</b></div>
          <div class="small">Total: <b>${run.plans.length}</b> • Running: <b>${run.running.length}</b> • Failed: <b>${run.failed.length}</b> • Completed: <b>${run.completed.length}</b></div>
        </div>
        <div class="item">
          <div><b>Recent Agent Runs</b></div>
          <div class="small">Click any run to jump to its timeline block.</div>
          <div class="settings-stack">
            ${
              run.plans.length
                ? run.plans.slice(0, 10).map(renderPlanRunRow).join("")
                : renderEmptyListRow("No runs yet", "Switch to Agent mode to start your first run.")
            }
          </div>
        </div>
        <div class="item">
          <div><b>Background Runs (Remote)</b></div>
          <div class="small">Tasks queued for background execution on the agent backend.</div>
          <div class="settings-actions settings-actions--compact">
            <button onclick="refreshRuntimeTasks();renderRuntimeTasksPanel();">Refresh</button>
          </div>
          <div id="runtimeTasksList" class="settings-stack">
            ${runtimeTasksLoading
              ? `<div class="small">Loading runs…</div>`
              : runtimeTasksCache && runtimeTasksCache.length
                ? runtimeTasksCache.map(renderRuntimeTaskRow).join("")
                : renderEmptyListRow("No background runs yet", "Queued backend work will appear here.")}
          </div>
        </div>
      `;
      return;
    }

    if (requestedTab === "structured" && !settingsTargetTab) {
      title.textContent = "Structured";
      meta.textContent = structuredStatusCache.enabled ? "on" : "off";
      const details = structuredStatusCache.loaded
        ? (structuredStatusCache.error
            ? `<div class="small settings-error">Error: ${escapeHtml(structuredStatusCache.error)}</div>`
            : `
                <div class="small">Enabled: <b>${structuredStatusCache.enabled ? "yes" : "no"}</b></div>
                <div class="small">Latest Session: <code>${escapeHtml(structuredStatusCache.latestSessionId || "none")}</code></div>
                <div class="small">PTY boundaries captured: <b>${escapeHtml(String(ptyBoundaryCaptured))}</b></div>
                <div class="small" id="ptyMetricsSummary">PTY metrics: (not loaded)</div>
              `)
        : `<div class="small">Loading status…</div>`;
      body.innerHTML = `
        <div class="item">
          <div><b>Structured Session V1</b></div>
          ${details}
        </div>
        <div class="item">
          <div class="search-inline">
            <input id="structuredSearchInput" placeholder="Search… e.g. status:failed risk:high-impact cwd:/repo" value="${escapeHtml(structuredSearchQuery)}" />
            <button onclick="runStructuredSearchFromInput()">Search</button>
            <button onclick="saveStructuredSearch()">Save search</button>
          </div>
          <div class="settings-actions settings-actions--compact">
            <span class="search-chip" onclick="applyStructuredSearchChip('status:failed')">status:failed</span>
            <span class="search-chip" onclick="applyStructuredSearchChip('status:ok')">status:ok</span>
            <span class="search-chip" onclick="applyStructuredSearchChip('risk:high-impact')">risk:high-impact</span>
            <span class="search-chip" onclick="applyStructuredSearchChip('after:${new Date(Date.now()-7*24*60*60*1000).toISOString().slice(0,10)}')">after:7d</span>
            <span class="search-chip" onclick="applyStructuredSearchChip('sort:newest')">sort:newest</span>
            <span class="search-chip" onclick="applyStructuredSearchChip('sort:duration')">sort:duration</span>
          </div>
          <div id="structuredSavedSearches" class="settings-actions settings-actions--compact"></div>
          <div id="structuredSearchResults" class="settings-stack"></div>
        </div>
        <div class="item settings-actions">
          <button onclick="refreshStructuredStatus()">Refresh</button>
          <button onclick="refreshPtyMetrics()">PTY Metrics</button>
          <button onclick="exportStructuredRunbook()">Export Latest Runbook</button>
          <button onclick="quickFindStructured()">Quick Find</button>
          <button onclick="replayLatestRunbook()">Replay Latest Runbook</button>
          <button onclick="shareLatestRunbook()">Share Runbook</button>
          <button onclick="manageShares()">Manage Shares</button>
          <button onclick="openShareDetails()">Share Details</button>
          <button onclick="exportAuditLog()">Export Audit</button>
        </div>
      `;
      renderSavedSearches();
      if (!structuredStatusCache.loaded) {
        refreshStructuredStatus();
      }
      return;
    }

    if (requestedTab === "workflows" && !settingsTargetTab) {
      void refreshSharedObjects();
      const wfs = listWorkflows();
      const sharedObjects = listSharedObjects();
      title.textContent = "Workflows";
      const monitorCount = Array.isArray(workflowTasksCache)
        ? workflowTasksCache.filter((t) => String(t?.payload?.mode || "") === "issue_to_pr").length
        : 0;
      meta.textContent = `${wfs.length} templates • ${sharedObjects.length} objects`;
      body.innerHTML = `
        <div class="item">
          <div><b>Issue → PR Monitor</b></div>
          <div class="small">Use \`fix issue 145 --repo owner/repo --push --live-pr\` in the composer to start.</div>
          <div class="settings-inline-group">
            <button onclick="refreshWorkflowPanel()">${workflowLoading ? "Refreshing..." : "Refresh"}</button>
            <label class="small settings-inline-label">Outcome
              <select id="workflowWebhookOutcomeFilter" onchange="onWorkflowWebhookFilterChange()">
                <option value="" ${workflowWebhookOutcomeFilter === "" ? "selected" : ""}>all</option>
                <option value="accepted" ${workflowWebhookOutcomeFilter === "accepted" ? "selected" : ""}>accepted</option>
                <option value="rejected" ${workflowWebhookOutcomeFilter === "rejected" ? "selected" : ""}>rejected</option>
              </select>
            </label>
            <label class="small settings-inline-label">Mapped
              <select id="workflowWebhookMappedFilter" onchange="onWorkflowWebhookFilterChange()">
                <option value="" ${workflowWebhookMappedFilter === "" ? "selected" : ""}>all</option>
                <option value="ci_status" ${workflowWebhookMappedFilter === "ci_status" ? "selected" : ""}>ci_status</option>
                <option value="pr_status" ${workflowWebhookMappedFilter === "pr_status" ? "selected" : ""}>pr_status</option>
                <option value="review_revision" ${workflowWebhookMappedFilter === "review_revision" ? "selected" : ""}>review_revision</option>
              </select>
            </label>
          </div>
          <div id="workflowMonitorSummary" class="small settings-summary">Loading monitor…</div>
          <div id="workflowMonitorList" class="settings-stack"></div>
          <div id="workflowMonitorAuditList" class="settings-stack settings-stack--tight"></div>
        </div>
        <div class="item">
          <div><b>Saved Local Workflows</b></div>
          <div id="savedWorkflowList" class="settings-stack">
            ${
              renderWorkflowList(wfs)
            }
          </div>
        </div>
        <div class="item">
          <div><b>Shared Objects</b></div>
          <div class="small">Reusable prompts and snippets for faster runs.</div>
          <div class="settings-grid-compact">
            <input id="sharedObjectName" placeholder="Object name (e.g. PR reviewer)" />
            <select id="sharedObjectKind">
              <option value="prompt">prompt</option>
              <option value="snippet">snippet</option>
              <option value="workflow-note">workflow-note</option>
            </select>
          </div>
          <textarea id="sharedObjectBody" rows="4" class="settings-textarea" placeholder="Object content..."></textarea>
          <div class="settings-actions settings-actions--compact">
            <button onclick="saveSharedObjectFromInputs()">Save object</button>
            <button onclick="saveSharedObjectFromComposer()">Use composer text</button>
          </div>
          <div id="sharedObjectList" class="settings-stack">
            ${
              renderSharedObjectList(sharedObjects)
            }
          </div>
        </div>
      `;
      refreshWorkflowPanel();
      return;
    }

    // settings
    if (activeSidebarTab === "settings") {
      updatePrimaryNav("diagnostics");
      title.textContent = "Settings";
      meta.textContent = settingsTargetTab || currentSettingsTab || "general";
      body.innerHTML = `
        <div class="settings-shell">
          <div class="settings-tabs" role="tablist" aria-label="Settings tabs">
            <button class="sttab active" data-st="general" role="tab" aria-selected="true" onclick="setSettingsTab('general')">General</button>
            <button class="sttab" data-st="runs" role="tab" aria-selected="false" onclick="setSettingsTab('runs')">Runs</button>
            <button class="sttab" data-st="appearance" data-testid="settings-tab-appearance" role="tab" aria-selected="false" onclick="setSettingsTab('appearance')">Appearance</button>
            <button class="sttab" data-st="safety" data-testid="settings-tab-safety" role="tab" aria-selected="false" onclick="setSettingsTab('safety')">Safety</button>
            <button class="sttab" data-st="structured" role="tab" aria-selected="false" onclick="setSettingsTab('structured')">Structured</button>
            <button class="sttab" data-st="workflows" role="tab" aria-selected="false" onclick="setSettingsTab('workflows')">Workflows</button>
            <button class="sttab" data-st="shares" role="tab" aria-selected="false" onclick="setSettingsTab('shares')">Shares</button>
            <button class="sttab" data-st="team" role="tab" aria-selected="false" onclick="setSettingsTab('team')">Team</button>
            <button class="sttab" data-st="onboarding" role="tab" aria-selected="false" onclick="setSettingsTab('onboarding')">Onboarding</button>
            <button class="sttab" data-st="keys" role="tab" aria-selected="false" onclick="setSettingsTab('keys')">Keys</button>
            <button class="sttab" data-st="diagnostics" data-testid="settings-diagnostics" role="tab" aria-selected="false" onclick="setSettingsTab('diagnostics')">Diagnostics</button>
            <button class="sttab" data-st="about" role="tab" aria-selected="false" onclick="setSettingsTab('about')">About</button>
          </div>
          <div class="settings-body">
            <div class="stpanel" data-stpanel="general">
              <div class="settings-card">
                <div class="settings-card-title">Behavior</div>
                <div class="settings-row"><span>Execution mode</span><span class="settings-value settings-value--strong">${escapeHtml(mode === "code" ? "Code" : mode === "agent" ? "Agent" : "Terminal")}</span></div>
                <div class="settings-row"><span>Workspace</span><span class="settings-value settings-value--mono">${escapeHtml((document.getElementById("projectRoot")?.value || "(not set)").trim() || "(not set)")}</span></div>
              </div>
            </div>
            <div class="stpanel" data-stpanel="runs" style="display:none;">
              <div class="settings-card">
                <div class="settings-card-title">Run Overview</div>
                <div id="settingsRunsPanel" class="small">Loading runs…</div>
              </div>
              <div class="settings-card">
                <div class="settings-card-title">Background Runs</div>
                <div class="small">Tasks queued for background execution on the agent backend.</div>
                <div class="settings-actions settings-actions--compact">
                  <button onclick="refreshRuntimeTasks(); setSettingsTab('runs');">Refresh</button>
                </div>
              </div>
            </div>
            <div class="stpanel" data-stpanel="appearance" style="display:none;">
              <div class="settings-card">
                <div class="settings-card-title">Themes</div>
                <div class="small">Select a theme or build your own custom theme.</div>
                <div id="themeGrid" class="theme-grid"></div>
              </div>
              <div class="settings-card">
                <div class="settings-card-title">Theme Editor</div>
                <div class="small">Saved custom themes are stored in userData as <code>themes.custom.json</code>.</div>
                <div class="theme-editor">
                  <label class="settings-row"><span>Theme ID</span><input id="teId" placeholder="e.g. mermaid-hot-pink-alt" /></label>
                  <label class="settings-row"><span>Name</span><input id="teName" placeholder="e.g. Mermaid - Hot Pink ALT" /></label>
                  <label class="settings-row"><span>Group</span><input id="teGroup" placeholder="e.g. Mermaid" /></label>
                  <div class="te-grid">
                    <div class="te-item"><div class="muted">Background</div><input type="color" id="teBg" /></div>
                    <div class="te-item"><div class="muted">Accent</div><input type="color" id="teAccent" /></div>
                    <div class="te-item"><div class="muted">Accent 2</div><input type="color" id="teAccent2" /></div>
                    <div class="te-item"><div class="muted">Text</div><input type="color" id="teText" /></div>
                    <div class="te-item"><div class="muted">Muted</div><input type="color" id="teMuted" /></div>
                    <div class="te-item"><div class="muted">Border</div><input type="color" id="teBorder" /></div>
                    <div class="te-item"><div class="muted">Danger</div><input type="color" id="teDanger" /></div>
                    <div class="te-item"><div class="muted">Success</div><input type="color" id="teSuccess" /></div>
                  </div>
                  <div class="muted settings-summary">Terminal palette (16 ANSI colors)</div>
                  <div id="teAnsi" class="ansi-grid"></div>
                  <div class="te-actions">
                    <button onclick="themeEditorApplyPreview()">Preview</button>
                    <button onclick="themeEditorSave()">Save to custom</button>
                    <button onclick="themeEditorExport()">Export JSON</button>
                    <button onclick="themeEditorDelete()">Delete custom</button>
                  </div>
                  <textarea id="teJson" class="te-json" placeholder="Paste JSON here to import, or export appears here."></textarea>
                  <div class="te-actions">
                    <button onclick="themeEditorImport()">Import JSON</button>
                    <button onclick="themeEditorClear()">Clear</button>
                  </div>
                </div>
              </div>
            </div>
            <div class="stpanel" data-stpanel="safety" style="display:none;">
              <div class="settings-card">
                <div class="settings-card-title">Execution Safety</div>
                <div class="settings-row"><span>Policy gate</span><span class="settings-value">Enforced</span></div>
                <div class="settings-row"><span>High-risk commands</span><span class="settings-value">Typed confirmation</span></div>
                <div class="settings-row"><span>Redaction before persistence</span><span class="settings-value">Enabled</span></div>
                <div class="settings-actions">
                  <button onclick="previewCurrentInputRedaction()">Preview redaction from input</button>
                  <button onclick="showPolicyPath()">Policy path</button>
                </div>
              </div>
              ${runtimePolicyEnv === "dev" ? `
              <div class="settings-card" data-testid="qa-panel">
                <div class="settings-card-title">QA Panel (Dev)</div>
                <div class="small">Deterministic smoke controls for stop/kill and diagnostics.</div>
                <div class="settings-actions">
                  <button data-testid="qa-start-long-run" onclick="qaStartLongRun()">Start long run</button>
                  <button data-testid="qa-running-streams" onclick="qaShowRunningStreams()">Show running streams</button>
                  <button data-testid="qa-structured-last20" onclick="qaDumpStructuredLast20()">Dump structured last 20</button>
                </div>
                <textarea id="qaOutput" class="te-json" data-testid="qa-output" placeholder="QA output appears here"></textarea>
              </div>
              ` : ""}
            </div>
            <div class="stpanel" data-stpanel="structured" style="display:none;">
              <div class="settings-card">
                <div class="settings-card-title">Structured Sessions</div>
                <div class="settings-row"><span>Capture mode</span><span class="settings-value">${structuredStatusCache.enabled ? "On" : "Off"}</span></div>
                <div class="settings-row"><span>Latest session</span><span class="settings-value settings-value--mono">${escapeHtml(structuredStatusCache.latestSessionId || "none")}</span></div>
                <div class="settings-actions">
                  <button onclick="refreshStructuredStatus()">Refresh status</button>
                  <button onclick="exportStructuredRunbook()">Export with publish gate</button>
                </div>
              </div>
              <div class="settings-card">
                <div class="settings-card-title">Search Structured Runs</div>
                <div class="search-inline">
                  <input id="structuredSearchInput" placeholder="Search… e.g. status:failed risk:high-impact cwd:/repo" value="${escapeHtml(structuredSearchQuery)}" />
                  <button onclick="runStructuredSearchFromInput()">Search</button>
                  <button onclick="saveStructuredSearch()">Save search</button>
                </div>
                <div class="settings-actions settings-actions--compact">
                  <span class="search-chip" onclick="applyStructuredSearchChip('status:failed')">status:failed</span>
                  <span class="search-chip" onclick="applyStructuredSearchChip('status:ok')">status:ok</span>
                  <span class="search-chip" onclick="applyStructuredSearchChip('risk:high-impact')">risk:high-impact</span>
                  <span class="search-chip" onclick="applyStructuredSearchChip('after:${new Date(Date.now()-7*24*60*60*1000).toISOString().slice(0,10)}')">after:7d</span>
                  <span class="search-chip" onclick="applyStructuredSearchChip('sort:newest')">sort:newest</span>
                  <span class="search-chip" onclick="applyStructuredSearchChip('sort:duration')">sort:duration</span>
                </div>
                <div id="structuredSavedSearches" class="settings-actions settings-actions--compact"></div>
                <div id="structuredSearchResults" class="settings-stack"></div>
              </div>
            </div>
            <div class="stpanel" data-stpanel="workflows" style="display:none;">
              <div class="settings-card">
                <div class="settings-card-title">Issue → PR Monitor</div>
                <div class="small">Use \`fix issue 145 --repo owner/repo --push --live-pr\` in the composer to start.</div>
                <div class="settings-actions settings-actions--compact">
                  <button onclick="refreshWorkflowPanel()">${workflowLoading ? "Refreshing..." : "Refresh"}</button>
                </div>
                <div id="workflowMonitorSummary" class="small settings-summary">Loading monitor…</div>
                <div id="workflowMonitorList" class="settings-stack"></div>
                <div id="workflowMonitorAuditList" class="settings-stack settings-stack--tight"></div>
              </div>
              <div class="settings-card">
                <div class="settings-card-title">Saved Local Workflows</div>
                <div id="savedWorkflowList" class="settings-stack"></div>
              </div>
              <div class="settings-card">
                <div class="settings-card-title">Shared Objects</div>
                <div class="small">Reusable prompts and snippets for faster runs.</div>
                <div class="settings-grid-compact">
                  <input id="sharedObjectName" placeholder="Object name (e.g. PR reviewer)" />
                  <select id="sharedObjectKind">
                    <option value="prompt">prompt</option>
                    <option value="snippet">snippet</option>
                    <option value="workflow-note">workflow-note</option>
                  </select>
                </div>
                <textarea id="sharedObjectBody" rows="4" class="settings-textarea" placeholder="Object content..."></textarea>
                <div class="settings-actions settings-actions--compact">
                  <button onclick="saveSharedObjectFromInputs()">Save object</button>
                  <button onclick="saveSharedObjectFromComposer()">Use composer text</button>
                </div>
                <div id="sharedObjectList" class="settings-stack"></div>
              </div>
            </div>
            <div class="stpanel" data-stpanel="shares" style="display:none;">
              <div class="settings-card">
                <div class="settings-card-title">Share Center</div>
                <div class="small">Review publish details, role gates, expiry windows, and revoke from one place.</div>
                <div class="settings-actions">
                  <button onclick="refreshSharesPanel()">Refresh shares</button>
                  <button onclick="shareLatestRunbook()">Publish latest runbook</button>
                  <button onclick="exportAuditLog()">Export audit</button>
                </div>
              </div>
              <div class="settings-card">
                <div id="shareSummary" class="small">Loading shares…</div>
                <div id="shareList" class="settings-stack"></div>
              </div>
            </div>
            <div class="stpanel" data-stpanel="team" style="display:none;">
              <div class="settings-card">
                <div class="settings-card-title">Team Workspace</div>
                <div id="teamSummary" class="small">Loading team…</div>
                <div class="settings-row settings-filter-row">
                  <span>Current user</span>
                  <input id="teamCurrentUserInput" type="email" placeholder="owner@local" />
                  <button onclick="switchTeamUser()">Apply</button>
                </div>
                <div class="settings-row settings-filter-row">
                  <span>Add/update member</span>
                  <input id="teamMemberEmailInput" type="email" placeholder="member@company.com" />
                  <select id="teamMemberRoleInput">
                    <option value="viewer">viewer</option>
                    <option value="operator">operator</option>
                    <option value="owner">owner</option>
                  </select>
                  <button onclick="upsertTeamMember()">Save</button>
                </div>
                <div class="settings-row settings-filter-row">
                  <span>Create invite</span>
                  <input id="teamInviteEmailInput" type="email" placeholder="invitee@company.com" />
                  <select id="teamInviteRoleInput">
                    <option value="viewer">viewer</option>
                    <option value="operator">operator</option>
                    <option value="owner">owner</option>
                  </select>
                  <button onclick="createTeamInvite()">Create invite</button>
                </div>
                <div class="settings-actions">
                  <button onclick="refreshTeamSummary()">Refresh team</button>
                  <button onclick="refreshTeamActivity()">Refresh activity</button>
                  <button onclick="refreshTeamInvites()">Refresh invites</button>
                  <button onclick="switchTeamUser(true)">Switch via prompt</button>
                  <button onclick="upsertTeamMember(true)">Add/update via prompt</button>
                  <button onclick="acceptTeamInvitePrompt()">Accept invite code</button>
                </div>
                <div id="teamMembersList" class="settings-stack"></div>
              </div>
              <div class="settings-card">
                <div class="settings-card-title">Pending Invites</div>
                <div id="teamInvitesSummary" class="small">Loading invites…</div>
                <div id="teamInvitesList" class="settings-stack"></div>
              </div>
              <div class="settings-card">
                <div class="settings-card-title">Team Activity</div>
                <div id="teamActivitySummary" class="small">Loading activity…</div>
                <div id="teamActivityList" class="settings-stack"></div>
              </div>
            </div>
            <div class="stpanel" data-stpanel="onboarding" style="display:none;">
              <div class="settings-card">
                <div class="settings-card-title">Activation Flow</div>
                <div class="small">Complete 3 tasks to reach first value fast.</div>
                <div id="activationStatus" class="small settings-note">Loading activation status…</div>
                <div id="activationSteps" class="small settings-note"></div>
                <div class="settings-actions">
                  <button onclick="runActivationSafeCommand()">Run safe command</button>
                  <button onclick="runActivationPlan()">Run plan</button>
                  <button onclick="downloadActivationReport()">Download report</button>
                  <button onclick="runOnboarding(true)">Restart flow</button>
                  <button onclick="importShellHistory()">Import shell history</button>
                  <button onclick="resetOnboarding()">Reset state</button>
                </div>
              </div>
            </div>
            <div class="stpanel" data-stpanel="keys" style="display:none;">
              <div class="settings-card">
                <div class="settings-card-title">Shortcuts</div>
                <div class="settings-row"><span>Command palette</span><span class="settings-kbd">Ctrl/⌘ + K</span></div>
                <div class="settings-row"><span>Open sessions / settings views</span><span class="settings-kbd">Alt + 1..6</span></div>
                <div class="settings-row"><span>Submit input</span><span class="settings-kbd">Enter</span></div>
              </div>
            </div>
            <div class="stpanel" data-stpanel="diagnostics" style="display:none;">
              <div class="settings-card">
                <div class="settings-card-title">Runtime Diagnostics</div>
                <div class="small">Shows the exact files and hashes currently loaded by the app.</div>
                <div class="settings-actions">
                  <button onclick="refreshDiagnosticsPanel()">${diagnosticsLoading ? "Refreshing..." : "Refresh"}</button>
                  <button id="diagnosticsAutoRefreshBtn" onclick="toggleDiagnosticsAutoRefresh()">Auto-refresh: On</button>
                  <select id="diagnosticsPollIntervalSelect" onchange="setDiagnosticsPollInterval(this.value)">
                    <option value="2000">2s</option>
                    <option value="5000">5s</option>
                    <option value="10000">10s</option>
                  </select>
                  <button onclick="startDaemonFromUi()">Start Agent Daemon</button>
                  <button onclick="stopDaemonFromUi()">Stop Agent Daemon</button>
                  <button onclick="copyDiagnosticsPanel()" ${diagnosticsCache ? "" : "disabled"}>Copy JSON</button>
                  <button onclick="enqueueDaemonSmokeTask()">Queue Agent Smoke Task</button>
                  <button onclick="saveSupportBundle()">Support Bundle</button>
                </div>
              </div>
              <div id="diagnosticsWarningsWrap" class="settings-card" style="display:none;">
                <div class="settings-card-title">Warnings</div>
                <ul id="diagnosticsWarnings" class="diag-warning-list"></ul>
              </div>
              <div id="diagnosticsRuntime" class="settings-card">
                <div class="small">Loading diagnostics…</div>
              </div>
              <div id="diagnosticsAgent" class="settings-card">
                <div class="small">Loading agent daemon status…</div>
              </div>
              <div class="settings-card">
                <div class="settings-card-title">Inline Rina Runs (Dev)</div>
                <div class="small">Inspect recent terminal-native Rina runs before deciding whether the current file-backed store needs a SQLite migration.</div>
                <div class="settings-row settings-filter-row">
                  <span>Trigger</span>
                  <select id="inlineRunsTriggerFilter">
                    <option value="">all</option>
                    <option value="input">input</option>
                    <option value="failure">failure</option>
                    <option value="selection">selection</option>
                  </select>
                  <span>Approved</span>
                  <select id="inlineRunsApprovedFilter">
                    <option value="">all</option>
                    <option value="yes">yes</option>
                    <option value="no">no</option>
                  </select>
                  <span>Executed</span>
                  <select id="inlineRunsExecutedFilter">
                    <option value="">all</option>
                    <option value="yes">yes</option>
                    <option value="no">no</option>
                  </select>
                </div>
                <div class="settings-actions">
                  <button onclick="refreshInlineRunsInspector()">Refresh runs</button>
                  <button onclick="exportInlineRuns('json')">Export JSON</button>
                  <button onclick="exportInlineRuns('csv')">Export CSV</button>
                </div>
                <div id="inlineRunsSummary" class="small settings-summary" data-testid="inline-runs-summary">No inline runs loaded yet.</div>
                <textarea id="inlineRunsOutput" class="te-json" data-testid="inline-runs-output" placeholder="Recent inline Rina runs appear here."></textarea>
              </div>
              <div id="diagnosticsFiles" class="diag-grid"></div>
              <div id="diagnosticsNotesWrap" class="settings-card" style="display:none;">
                <div class="settings-card-title">Notes</div>
                <ul id="diagnosticsNotes" class="diag-warning-list settings-note--muted"></ul>
              </div>
            </div>
            <div class="stpanel" data-stpanel="about" style="display:none;">
              <div class="settings-card">
                <div class="settings-card-title">RinaWarp</div>
                <div class="small">Local-first terminal execution assistant with policy-gated command execution and redaction-enforced persistence/export paths.</div>
              </div>
            </div>
          </div>
        </div>
      `;
      setSettingsTab(settingsTargetTab || currentSettingsTab || "general");
      return;
    }

  }

  function updatePane(title, meta) {
    const titleEl = document.getElementById("paneTitle");
    const metaEl = document.getElementById("paneMeta");
    if (titleEl) titleEl.textContent = title || "";
    if (metaEl) metaEl.textContent = meta || "";
  }

  window.RinaWarpNavigationController = {
    summarizePlanRuns,
    focusBlock,
    setTab: setSidebarTab,
    updatePane,
  };
  window.focusBlock = focusBlock;
  window.setSidebarTab = setSidebarTab;
})();
