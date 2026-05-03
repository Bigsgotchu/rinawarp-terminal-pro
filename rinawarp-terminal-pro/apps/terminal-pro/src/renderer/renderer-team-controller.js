(function () {
  'use strict';

  async function shareLatestRunbook() {
    try {
      const runbookPreview = await window.rina?.exportStructuredRunbookPreview?.();
      const markdown = runbookPreview?.markdown || "";
      if (!markdown) {
        toast("No runbook to share");
        return;
      }
      const publishPreview = await window.rina?.sharePreview?.({ content: markdown });
      if (!publishPreview?.ok || !publishPreview.previewId) {
        toast(publishPreview?.error || "Failed to prepare redaction preview");
        return;
      }
      const title = prompt("Share title:", "Latest structured runbook") || "Latest structured runbook";
      const expiresDaysRaw = prompt("Expiry (days, 1-90):", "7") || "7";
      const expiresDays = Math.max(1, Math.min(90, Number(expiresDaysRaw || "7")));
      const requiredRole = (prompt("Minimum role to access (viewer/operator/owner):", "viewer") || "viewer").trim().toLowerCase();
      if (!["viewer", "operator", "owner"].includes(requiredRole)) {
        toast("Invalid role requirement");
        return;
      }
      const redactionCount = Number(publishPreview?.redactionCount || 0);
      const previewSample = String(publishPreview?.redactedText || "")
        .slice(0, 220)
        .replace(/\s+/g, " ")
        .trim();
      const confirmText = [
        `Publish share "${title}"?`,
        `- Expiry: ${expiresDays} day(s)`,
        `- Required role: ${requiredRole}`,
        `- Redactions applied: ${redactionCount}`,
        `- Preview expires: ${publishPreview.expiresAt || "soon"}`,
        previewSample ? `- Preview sample: ${previewSample}${(publishPreview.redactedText || "").length > 220 ? "..." : ""}` : "",
      ].join("\n");
      const ok = confirm(confirmText);
      if (!ok) {
        toast("Publish cancelled");
        return;
      }
      const res = await window.rina?.createShare?.({
        title,
        expiresDays,
        requiredRole,
        previewId: publishPreview.previewId,
      });
      if (!res?.ok) {
        toast(res?.error || "Share failed");
        return;
      }
      await navigator.clipboard.writeText(res.share.id);
      toast(`Share created: ${res.share.id} (copied)`);
    } catch (err) {
      const msg = (err && err.message) ? err.message : String(err || "share failed");
      toast(`Share failed: ${msg}`);
    }
  }

  async function manageShares() {
    try {
      setSidebarTab("settings");
      setSettingsTab("shares");
      await refreshSharesPanel();
      toast("Opened Share Center");
    } catch (err) {
      const msg = (err && err.message) ? err.message : String(err || "share management failed");
      toast(`Share management failed: ${msg}`);
    }
  }

  async function openShareDetails(id) {
    try {
      const shares = await window.rina?.listShares?.() || [];
      if (!Array.isArray(shares) || !shares.length) {
        toast("No shares yet");
        return;
      }
      const target = id ? shares.find((s) => s.id === id) : shares[0];
      if (!target?.id) {
        toast("Share not found");
        return;
      }
      const res = await window.rina?.getShare?.(target.id);
      if (!res?.ok) {
        toast(res?.error || "Cannot open share");
        return;
      }
      const s = res.share;
      addBlock({
        id: newId("assistant"),
        type: "assistant",
        status: "ok",
        createdAt: Date.now(),
        title: `Share ${s.id}`,
        markdown: `Title: ${s.title || "(untitled)"}\nCreated: ${s.createdAt}\nBy: ${s.createdBy || "unknown"}\nRole: ${s.requiredRole || "viewer"}\nExpires: ${s.expiresAt}\n\n${String(s.content || "").slice(0, 2000)}`,
      });
    } catch (err) {
      toast(`Share detail failed: ${err?.message || err}`);
    }
  }

  async function revokeShareById(id) {
    if (!id) return;
    const ok = confirm(`Revoke ${id}?`);
    if (!ok) return;
    const res = await revokeShare(id);
    toast(res?.ok ? `Revoked ${id}` : (res?.error || "Revoke failed"));
    await refreshSharesPanel();
  }

  async function refreshSharesPanel() {
    try {
      const root = document.getElementById("shareList");
      const summary = document.getElementById("shareSummary");
      if (!root || !summary) return;
      const shares = await listShares();
      if (!Array.isArray(shares) || !shares.length) {
        summary.textContent = "No shares found for current role.";
        root.innerHTML = "";
        return;
      }
      const active = shares.filter((s) => !s.revoked).length;
      summary.textContent = `Visible shares: ${shares.length} • Active: ${active} • Revoked: ${shares.length - active}`;
      root.innerHTML = renderSharesList(shares);
    } catch (err) {
      const summary = document.getElementById("shareSummary");
      const root = document.getElementById("shareList");
      if (summary) summary.textContent = `Share panel failed: ${err?.message || err}`;
      if (root) root.innerHTML = "";
    }
  }

  async function exportAuditLog() {
    try {
      const preview = await window.rina?.exportPreview?.({ kind: "audit_json" });
      if (!preview?.ok || !preview.previewId) {
        throw new Error(preview?.error || "Failed to prepare audit export preview");
      }
      const typed = prompt(
        `Audit export publish control:\n` +
        `- Redactions applied: ${Number(preview.redactionCount || 0)}\n` +
        `- Preview expires: ${preview.expiresAt || "soon"}\n` +
        `Type "PUBLISH" to download audit export.`
      ) ?? "";
      if (typed !== "PUBLISH") {
        toast("Audit export cancelled");
        return;
      }
      const published = await window.rina?.exportPublish?.({
        previewId: preview.previewId,
        typedConfirm: typed,
        expectedHash: preview.contentHash,
      });
      if (!published?.ok || !published.content) {
        throw new Error(published?.error || "Audit export failed");
      }
      const blob = new Blob([published.content], { type: published.mime || "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = published.fileName || `rina-audit-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Audit exported");
    } catch (err) {
      const msg = (err && err.message) ? err.message : String(err || "audit export failed");
      toast(`Audit export failed: ${msg}`);
    }
  }

  async function refreshTeamSummary() {
    try {
      const team = await teamGet();
      const node = document.getElementById("teamSummary");
      const list = document.getElementById("teamMembersList");
      if (!node) return;
      if (!team) {
        node.textContent = "Team API unavailable";
        if (list) list.innerHTML = "";
        return;
      }
      if (team.ok === false) {
        node.textContent = team.error || "Power / Team plan required for team features";
        if (list) list.innerHTML = "";
        return;
      }
      const members = (team.members || []).map((m) => `${m.email} (${m.role})`).join(", ");
      node.textContent = `Current: ${team.currentUser || "unknown"} • Members: ${members || "none"}`;
      const currentInput = document.getElementById("teamCurrentUserInput");
      if (currentInput && !currentInput.value) currentInput.value = team.currentUser || "";
      if (list) {
        list.innerHTML = renderTeamList(team.members || [], team.currentUser || "");
      }
    } catch {
      const node = document.getElementById("teamSummary");
      if (node) node.textContent = "Team load failed";
      const list = document.getElementById("teamMembersList");
      if (list) list.innerHTML = "";
    }
  }

  async function refreshTeamInvites() {
    const summary = document.getElementById("teamInvitesSummary");
    const list = document.getElementById("teamInvitesList");
    if (!summary || !list) return;
    try {
      const res = await teamListInvites();
      if (!res?.ok) {
        summary.textContent = res?.error || "Invite API unavailable";
        list.innerHTML = "";
        return;
      }
      const invites = Array.isArray(res.invites) ? res.invites : [];
      if (!invites.length) {
        summary.textContent = "No invites";
        list.innerHTML = "";
        return;
      }
      const pending = invites.filter((inv) => inv.status === "pending").length;
      summary.textContent = `Total: ${invites.length} • Pending: ${pending}`;
      list.innerHTML = renderTeamInviteList(invites);
    } catch {
      summary.textContent = "Invite load failed";
      list.innerHTML = "";
    }
  }

  async function createTeamInvite() {
    const email = (document.getElementById("teamInviteEmailInput")?.value || "").trim().toLowerCase();
    const role = (document.getElementById("teamInviteRoleInput")?.value || "viewer").trim().toLowerCase();
    if (!email) {
      toast("Invite email required");
      return;
    }
    if (!["viewer", "operator", "owner"].includes(role)) {
      toast("Invalid invite role");
      return;
    }
    const res = await window.rina?.teamCreateInvite?.({ email, role, expiresHours: 72 });
    if (!res?.ok) {
      toast(res?.error || "Failed to create invite");
      return;
    }
    const code = res?.invite?.inviteCode || "";
    if (code) await navigator.clipboard.writeText(code).catch(() => {});
    toast(code ? `Invite created (code copied)` : "Invite created");
    const inviteEmailInput = document.getElementById("teamInviteEmailInput");
    if (inviteEmailInput) inviteEmailInput.value = "";
    refreshTeamInvites();
    refreshTeamActivity();
  }

  async function acceptTeamInvitePrompt() {
    const inviteCode = (prompt("Paste invite code:", "") || "").trim();
    if (!inviteCode) return;
    const res = await window.rina?.teamAcceptInvite?.({ inviteCode });
    if (!res?.ok) {
      toast(res?.error || "Invite accept failed");
      return;
    }
    toast(`Invite accepted. Role: ${res.role || "viewer"}`);
    refreshPolicyStatus();
    refreshTeamSummary();
    refreshTeamInvites();
    refreshTeamActivity();
  }

  async function revokeTeamInvite(id) {
    const ok = confirm(`Revoke invite ${id}?`);
    if (!ok) return;
    const res = await window.rina?.teamRevokeInvite?.(id);
    if (!res?.ok) {
      toast(res?.error || "Failed to revoke invite");
      return;
    }
    toast("Invite revoked");
    refreshTeamInvites();
    refreshTeamActivity();
  }

  async function copyInviteCodePrompt(id) {
    const res = await teamListInvites({ includeSecrets: true });
    if (!res?.ok) {
      toast(res?.error || "Cannot load invite code");
      return;
    }
    const target = (res.invites || []).find((inv) => inv.id === id);
    const code = target?.inviteCode || "";
    if (!code) {
      toast("Invite code unavailable for your role");
      return;
    }
    await navigator.clipboard.writeText(code).catch(() => {});
    toast("Invite code copied");
  }

  async function refreshTeamActivity() {
    const summary = document.getElementById("teamActivitySummary");
    const list = document.getElementById("teamActivityList");
    if (!summary || !list) return;
    try {
      const res = await teamActivity({ limit: 40 });
      if (!res?.ok) {
        summary.textContent = res?.error || "Activity unavailable";
        list.innerHTML = "";
        return;
      }
      const events = Array.isArray(res.events) ? res.events : [];
      summary.textContent = events.length ? `Recent events: ${events.length}` : "No activity yet";
      list.innerHTML = renderTeamActivityList(events);
    } catch {
      summary.textContent = "Activity load failed";
      list.innerHTML = "";
    }
  }

  async function setTeamMemberRole(email) {
    const safe = String(email || "").replace(/[^a-z0-9]/gi, "_");
    const sel = document.getElementById(`teamRole_${safe}`);
    const role = (sel?.value || "").trim().toLowerCase();
    if (!email || !["viewer", "operator", "owner"].includes(role)) return;
    const res = await window.rina?.teamUpsertMember?.({ email, role });
    if (!res?.ok) {
      toast(res?.error || "Failed to set role");
      return;
    }
    toast(`Role updated: ${email} -> ${role}`);
    refreshTeamSummary();
    refreshTeamActivity();
  }

  async function removeTeamMember(email) {
    const ok = confirm(`Remove team member ${email}?`);
    if (!ok) return;
    const res = await window.rina?.teamRemoveMember?.(email);
    if (!res?.ok) {
      toast(res?.error || "Failed to remove member");
      return;
    }
    toast(`Removed ${email}`);
    refreshTeamSummary();
    refreshTeamActivity();
    refreshPolicyStatus();
  }

  async function switchTeamUser(forcePrompt = false) {
    const fromInput = (document.getElementById("teamCurrentUserInput")?.value || "").trim().toLowerCase();
    const email = forcePrompt ? (prompt("Set current user email:", fromInput || "") || "").trim().toLowerCase() : fromInput;
    if (!email) return;
    const res = await window.rina?.teamSetCurrentUser?.(email);
    if (!res?.ok) {
      toast(res?.error || "Failed to switch user");
      return;
    }
    toast(`Current user: ${email} (${res.role || "viewer"})`);
    refreshPolicyStatus();
    refreshTeamSummary();
    refreshTeamActivity();
  }

  async function upsertTeamMember(forcePrompt = false) {
    const fromEmail = (document.getElementById("teamMemberEmailInput")?.value || "").trim().toLowerCase();
    const fromRole = (document.getElementById("teamMemberRoleInput")?.value || "viewer").trim().toLowerCase();
    const email = forcePrompt ? (prompt("Member email:", fromEmail || "") || "").trim().toLowerCase() : fromEmail;
    if (!email) return;
    const role = forcePrompt
      ? (prompt("Role (viewer/operator/owner):", fromRole || "viewer") || "viewer").trim().toLowerCase()
      : fromRole;
    if (!["viewer", "operator", "owner"].includes(role)) {
      toast("Invalid role");
      return;
    }
    const res = await window.rina?.teamUpsertMember?.({ email, role });
    if (!res?.ok) {
      toast(res?.error || "Failed to update member");
      return;
    }
    toast("Team member updated");
    const memberEmailInput = document.getElementById("teamMemberEmailInput");
    if (memberEmailInput) memberEmailInput.value = "";
    refreshTeamSummary();
    refreshTeamActivity();
  }

  window.RinaWarpTeamController = {
    shareLatestRunbook,
    manageShares,
    openShareDetails,
    revokeShareById,
    refreshSharesPanel,
    exportAuditLog,
    refreshTeamSummary,
    refreshTeamInvites,
    createTeamInvite,
    acceptTeamInvitePrompt,
    revokeTeamInvite,
    copyInviteCodePrompt,
    refreshTeamActivity,
    setTeamMemberRole,
    removeTeamMember,
    switchTeamUser,
    upsertTeamMember,
  };
  Object.assign(window, window.RinaWarpTeamController);
})();
