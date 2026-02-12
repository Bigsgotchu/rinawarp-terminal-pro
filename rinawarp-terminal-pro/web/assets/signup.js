import { escapeHtml } from "/assets/auth-pages.js";

const API_CANDIDATES = [
  "/api",
  "https://api.rinawarptech.com/api"
];

function toast(text, isErr = false) {
  const el = document.getElementById("msg");
  el.innerHTML = `<div class="toast ${isErr ? "err" : ""}">${escapeHtml(text)}</div>`;
}

async function postJson(path, payload) {
  let lastError = null;

  for (const base of API_CANDIDATES) {
    try {
      const res = await fetch(`${base}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Auth start failed (${res.status}): ${t || res.statusText}`);
      }

      return await res.json();
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("All API endpoints failed");
}

async function startAuth() {
  const btn = document.getElementById("btn");
  const email = document.getElementById("email").value.trim();
  if (!email) return toast("Please enter your email.", true);

  btn.disabled = true;
  toast("Sending magic link...");

  try {
    const data = await postJson("/auth/start", { email, mode: "signup" });
    if (data?.next) {
      // If backend returns a redirect URL, follow it.
      window.location.href = data.next;
      return;
    }

    toast("Check your inbox for the sign-in link.");
  } catch (e) {
    toast(e?.message || "Failed to start sign-in.", true);
  } finally {
    btn.disabled = false;
  }
}

document.getElementById("btn").addEventListener("click", startAuth);
document.getElementById("email").addEventListener("keydown", (e) => {
  if (e.key === "Enter") startAuth();
});
