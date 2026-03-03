import { safeNext } from "/assets/auth-pages.js";

const API_CANDIDATES = [
  "/api",
  "https://api.rinawarptech.com/api",
];

let challengeId = null;

function toast(text, isErr = false) {
  const el = document.getElementById("msg");
  el.style.display = "block";
  el.textContent = String(text || "");
  el.className = `toast ${isErr ? "err" : ""}`;
}

async function postJson(path, payload) {
  let lastError = null;

  for (const base of API_CANDIDATES) {
    try {
      const res = await fetch(`${base}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
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

async function startSignup() {
  const email = document.getElementById("email").value.trim();
  const btn = document.getElementById("btn");
  if (!email) return toast("Please enter your email.", true);

  btn.disabled = true;
  toast("Sending code...");
  if (window.rwTrack) {
    window.rwTrack("signup_code_request_click").catch(() => {});
  }
  try {
    const data = await postJson("/auth/start", { email, mode: "signup" });
    challengeId = data.challenge_id;
    if (window.rwTrack) {
      window.rwTrack("signup_code_sent").catch(() => {});
    }
    document.getElementById("step1").style.display = "none";
    document.getElementById("step2").style.display = "block";
    toast("Code sent. If you don't see it, check spam.");
  } catch (e) {
    toast(e?.message || "Failed to send code.", true);
  } finally {
    btn.disabled = false;
  }
}

async function verifySignup() {
  const email = document.getElementById("email").value.trim();
  const code = document.getElementById("code").value.trim();
  const btn = document.getElementById("verify");
  if (!email) return toast("Missing email.", true);
  if (!/^\d{6}$/.test(code)) return toast("Enter the 6-digit code.", true);
  if (!challengeId) return toast("Missing challenge. Please request a new code.", true);

  btn.disabled = true;
  toast("Verifying...");
  if (window.rwTrack) {
    window.rwTrack("signup_verify_click").catch(() => {});
  }
  try {
    const data = await postJson("/auth/verify", { email, challenge_id: challengeId, code, mode: "signup" });
    localStorage.setItem("rw_session", data.session_token);
    if (window.rwTrack) {
      window.rwTrack("signup_success").catch(() => {});
    }
    document.getElementById("step2").style.display = "none";
    document.getElementById("step3").style.display = "block";

    setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const next = safeNext(params.get("next") || "/account/");
      window.location.href = next;
    }, 800);
  } catch (e) {
    if (window.rwTrack) {
      window.rwTrack("signup_verify_error").catch(() => {});
    }
    toast(e?.message || "Invalid code.", true);
  } finally {
    btn.disabled = false;
  }
}

document.getElementById("btn").addEventListener("click", startSignup);
document.getElementById("email").addEventListener("keydown", (e) => {
  if (e.key === "Enter") startSignup();
});
document.getElementById("verify").addEventListener("click", verifySignup);
document.getElementById("code").addEventListener("keydown", (e) => {
  if (e.key === "Enter") verifySignup();
});
