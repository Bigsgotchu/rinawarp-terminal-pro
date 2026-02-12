import { normalizeTokenToQuery, safeNext } from "/assets/auth-pages.js";

const API_CANDIDATES = [
  "/api",
  "https://api.rinawarptech.com/api"
];

// Normalize /login/<token> to /login/?token=<token>
normalizeTokenToQuery();

let challengeId = null;

async function postJson(path, payload) {
  let lastError = null;

  for (const base of API_CANDIDATES) {
    try {
      const res = await fetch(`${base}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.message || data.error || `Request failed (${res.status})`);
        err.data = data;
        throw err;
      }

      return data;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("All API endpoints failed");
}

document.getElementById("start").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const msg = document.getElementById("startMsg");
  msg.textContent = "Sending...";

  try {
    const data = await postJson("/auth/start", { email });
    challengeId = data.challenge_id;
    msg.textContent = "Code sent. (If you don't see it, check spam.)";
    document.getElementById("step2").style.display = "block";
  } catch (err) {
    msg.textContent = err?.message || "Failed";
  }
});

document.getElementById("verify").addEventListener("click", async () => {
  const code = document.getElementById("code").value.trim();
  const msg = document.getElementById("verifyMsg");
  msg.textContent = "Verifying...";

  try {
    const data = await postJson("/auth/verify", { challenge_id: challengeId, code });

    localStorage.setItem("rw_session", data.session_token);
    document.getElementById("step1").style.display = "none";
    document.getElementById("step2").style.display = "none";
    document.getElementById("step3").style.display = "block";

    // Auto-redirect to next or account page
    setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const next = safeNext(params.get("next") || "/account/");
      window.location.href = next;
    }, 1500);
  } catch (err) {
    msg.textContent = err?.message || "Invalid code";
  }
});
