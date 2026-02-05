import { escapeHtml } from "/assets/auth-pages.js";

const API = "https://api.rinawarptech.com";

function toast(text, isErr=false) {
  const el = document.getElementById("msg");
  el.innerHTML = `<div class="toast ${isErr ? "err" : ""}">${escapeHtml(text)}</div>`;
}

async function startAuth() {
  const btn = document.getElementById("btn");
  const email = document.getElementById("email").value.trim();
  if (!email) return toast("Please enter your email.", true);

  btn.disabled = true;
  toast("Sending magic link…");

  try {
    const res = await fetch(`${API}/api/auth/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, mode: "signup" })
    });

    if (!res.ok) {
      const t = await res.text().catch(()=> "");
      throw new Error(`Auth start failed (${res.status}): ${t || res.statusText}`);
    }

    const data = await res.json();
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
