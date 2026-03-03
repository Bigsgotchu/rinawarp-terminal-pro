(function () {
  const ENDPOINTS = ["/api/events", "https://api.rinawarptech.com/api/events"];
  const STORAGE_KEYS = {
    anon: "rw_anon_id",
    session: "rw_session_id",
  };

  function uid(prefix) {
    const rand = Math.random().toString(36).slice(2, 10);
    return `${prefix}_${Date.now().toString(36)}_${rand}`;
  }

  function getOrCreate(key, prefix) {
    try {
      const existing = localStorage.getItem(key);
      if (existing) return existing;
      const created = uid(prefix);
      localStorage.setItem(key, created);
      return created;
    } catch {
      return uid(prefix);
    }
  }

  function getUtm() {
    const q = new URLSearchParams(window.location.search);
    const out = {};
    const keys = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
    ];
    for (const k of keys) {
      const v = q.get(k);
      if (v) out[k] = v;
    }
    return out;
  }

  async function postEvent(payload) {
    const body = JSON.stringify(payload);
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
          keepalive: true,
        });
        if (res.ok) return true;
      } catch {}
    }
    return false;
  }

  function normalizeEventName(name) {
    return String(name || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_:. -]/g, "_")
      .slice(0, 80);
  }

  window.rwTrack = function rwTrack(event, properties) {
    const evt = normalizeEventName(event);
    if (!evt) return Promise.resolve(false);
    const payload = {
      event: evt,
      path: window.location.pathname,
      href: window.location.href,
      referrer: document.referrer || "",
      anon_id: getOrCreate(STORAGE_KEYS.anon, "anon"),
      session_id: getOrCreate(STORAGE_KEYS.session, "sess"),
      properties: properties || {},
      utm: getUtm(),
    };
    return postEvent(payload);
  };

  // Auto page view
  window.rwTrack("page_view", { title: document.title }).catch(() => {});

  // Opt-in click tracking via data-track attribute
  document.addEventListener("click", (e) => {
    const el = e.target && e.target.closest ? e.target.closest("[data-track]") : null;
    if (!el) return;
    const event = el.getAttribute("data-track");
    const props = {
      href: el.getAttribute("href") || null,
      id: el.id || null,
      text: (el.textContent || "").trim().slice(0, 120),
    };
    window.rwTrack(event, props).catch(() => {});
  });
})();
