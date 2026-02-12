(() => {
  const PLANS = {
    founder: {
      name: "Founder Lifetime",
      price: "$699",
      priceId: "price_1SdxlmGZrRdZy3W9ncwPfgFr",
      badge: "Limited",
      bullets: ["Lifetime access to Pro", "All future Pro features", "Founder badge"]
    },
    pioneer: {
      name: "Pioneer Lifetime",
      price: "$800",
      priceId: "price_1Sdxm2GZrRdZy3W9C5tQcWiW",
      badge: "Limited",
      bullets: ["Lifetime access", "Priority feature access", "Long-term support tier"]
    },
    team: {
      name: "Team Lifetime",
      price: "$999",
      priceId: "price_1SdxmFGZrRdZy3W9skXi3jvE",
      badge: "Limited",
      bullets: ["Lifetime access", "Highest tier support", "Best for organizations"]
    }
  };

  async function readActiveKey() {
    // allow testing: ?lifetime=founder|pioneer|team
    const url = new URL(window.location.href);
    const override = url.searchParams.get("lifetime");
    if (override && PLANS[override]) return override;

    try {
      const res = await fetch("/assets/lifetime.json", { cache: "no-store" });
      const cfg = await res.json();
      if (cfg && typeof cfg.active === "string" && PLANS[cfg.active]) return cfg.active;
    } catch (_) {}

    return "founder";
  }

  function render(planKey) {
    const p = PLANS[planKey];
    const el = document.getElementById("lifetime-card");
    if (!el || !p) return;

    el.innerHTML = `
      <div class="pricing-card featured">
        <div class="badge">${p.badge}</div>
        <h3>${p.name}</h3>
        <div class="price">${p.price}<span class="muted"> one-time</span></div>
        <ul class="pricing-features">
          ${p.bullets.map(x => `<li>${x}</li>`).join("")}
        </ul>
        <button class="btn btn-primary featured" onclick="startCheckout('${p.priceId}')">
          Buy ${p.name.split(" ")[0]} — ${p.price}
        </button>
        <div class="fineprint">Limited availability</div>
      </div>
    `;
  }

  readActiveKey().then(render);
})();
