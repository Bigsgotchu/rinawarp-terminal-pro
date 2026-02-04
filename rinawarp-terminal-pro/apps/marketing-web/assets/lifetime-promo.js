// ---- CONFIG: change ONE value when a promo sells out ----
// valid: "founder" -> $699, "pioneer" -> $800, "team" -> $999
const ACTIVE_LIFETIME_PROMO = "founder";

const lifetimePlans = {
    founder: {
        name: "Founder Lifetime",
        price: "$699",
        priceId: "price_1SdxlmGZrRdZy3W9ncwPfgFr",
        badge: "Limited",
        bullets: [
            "Lifetime access to Pro",
            "All future Pro features",
            "Founder badge"
        ]
    },
    pioneer: {
        name: "Pioneer Lifetime",
        price: "$800",
        priceId: "price_1Sdxm2GZrRdZy3W9C5tQcWiW",
        badge: "Limited",
        bullets: [
            "Lifetime access",
            "Priority feature access",
            "Long-term support tier"
        ]
    },
    team: {
        name: "Team Lifetime",
        price: "$999",
        priceId: "price_1SdxmFGZrRdZy3W9skXi3jvE",
        badge: "Limited",
        bullets: [
            "Lifetime access",
            "Highest tier support",
            "Best for organizations"
        ]
    }
};

// Optional: allow testing with ?lifetime=founder|pioneer|team
const url = new URL(window.location.href);
const override = url.searchParams.get("lifetime");
const key = (override && lifetimePlans[override]) ? override : ACTIVE_LIFETIME_PROMO;

const p = lifetimePlans[key];

const mount = document.getElementById("lifetime-card");
if (mount) {
    mount.innerHTML = `
        <div class="pricing-card featured">
            <div class="badge">${p.badge}</div>
            <h3>${p.name}</h3>
            <div class="price">${p.price}<span class="muted"> one-time</span></div>
            <ul class="pricing-features">
                ${p.bullets.map((x) => `<li>${x}</li>`).join("")}
            </ul>
            <button class="btn btn-primary featured" onclick="startCheckout('${p.priceId}')">
                Buy ${p.name.split(" ")[0]} — ${p.price}
            </button>
            <div class="fineprint">Limited availability</div>
        </div>
    `;
}
