# RinaWarp API Contract — Auth + Account (v1.0.0)

This document is the **single source of truth** for how the website and desktop app interact with the API for:
- login / signup (magic link)
- session identity
- download tokens
- portal access

If an implementation diverges from this document, it is a bug.

---

## 0) Base URLs & Environments

**Production API**
- `https://api.rinawarptech.com`

**Production Website Origins (CORS allowlist)**
- `https://www.rinawarptech.com`
- `https://rinawarptech.com` (optional, if apex is used)

---

## 1) Cross-Cutting Requirements (Non-Negotiable)

### 1.1 CORS (browser clients)
For any endpoint called from the website:
- Must handle `OPTIONS` preflight.
- Must respond with:
  - `Access-Control-Allow-Origin: https://www.rinawarptech.com` (or reflect allowlist)
  - `Access-Control-Allow-Methods: GET,POST,OPTIONS`
  - `Access-Control-Allow-Headers: content-type, authorization`
  - `Access-Control-Allow-Credentials: true` (only if you use cookies)
- If reflecting origin, do not use `*` when credentials are enabled.

### 1.2 Auth model (choose one and enforce consistently)
**Option A — Cookie session**
- `auth/verify` sets an `HttpOnly; Secure; SameSite=Lax` cookie.
- Website uses `credentials: "include"` for requests.

**Option B — Bearer token**
- `auth/verify` returns a token.
- Clients send: `Authorization: Bearer <token>`.

Pick one. This spec supports either; endpoints must state which is used.

### 1.3 "Signup vs Login"
Signup is not a separate product in v1; it is **the same auth start flow** with `mode: "signup" | "login"` used for messaging and analytics.
- First-time email -> account is created during verify.

### 1.4 Redirect safety
Any API-provided redirect must be **relative path only**, or constrained to allowlist.
Never redirect to arbitrary external origins.

### 1.5 Token in URL
Tokens may arrive as:
- query: `/login/?token=abc`
- path legacy: `/login/abc/` or `/qzje/abc/`

Client-side normalization is allowed, but server must accept the canonical query version.

---

## 2) Endpoint Contracts

### 2.1 POST /api/auth/start
Start the auth flow (magic link).

**Browser CORS:** required  
**Auth:** none

#### Request
`Content-Type: application/json`

```json
{
  "email": "user@example.com",
  "mode": "login"
}
```

- `email` required
- `mode` optional, default `"login"`, allowed: `"login" | "signup"`

#### Response (200)

```json
{
  "ok": true,
  "message": "Magic link sent",
  "next": "/login/?email=user%40example.com"
}
```

- `next` is optional. If present, it must be a relative path.

#### Errors

| Status | Body |
|--------|------|
| 400 | `{ "ok": false, "error": "invalid_email" }` |
| 429 | `{ "ok": false, "error": "rate_limited" }` |
| 500 | `{ "ok": false, "error": "internal_error" }` |

---

### 2.2 GET /api/auth/verify?token=...
Verify the magic link token and establish an authenticated session.

**Browser CORS:** required  
**Auth:** none (token-based)

#### Request

Query param:
- `token` required (opaque string)

#### Response (200)

**Option A — Cookie session**

```json
{
  "ok": true,
  "user": { "id": "usr_123", "email": "user@example.com" },
  "redirect": "/account/"
}
```

Sets cookie: `Set-Cookie: rinawarp_session=...; HttpOnly; Secure; SameSite=Lax; Path=/`

**Option B — Bearer token**

```json
{
  "ok": true,
  "token": "eyJhbGciOi...",
  "user": { "id": "usr_123", "email": "user@example.com" },
  "redirect": "/account/"
}
```

**Redirect field rules**
- `redirect` must be a relative path
- default: `/account/`

#### Errors

| Status | Body |
|--------|------|
| 400 | `{ "ok": false, "error": "missing_token" }` |
| 401 | `{ "ok": false, "error": "token_invalid" }` |
| 410 | `{ "ok": false, "error": "token_used" }` |

---

### 2.3 GET /api/me
Return the current authenticated user + entitlements.

**Browser CORS:** required  
**Auth:** required

#### Request

**Option A (cookie):**
- `credentials: "include"`

**Option B (bearer):**
- `Authorization: Bearer <token>`

#### Response (200)

```json
{
  "ok": true,
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "createdAt": "2026-02-05T10:00:00Z"
  },
  "license": {
    "tier": "starter",
    "status": "active",
    "expiresAt": null
  }
}
```

#### Errors

| Status | Body |
|--------|------|
| 401 | `{ "ok": false, "error": "unauthorized" }` |

---

### 2.4 POST /api/download-token
Mint a short-lived download token used for installer URLs.

**Browser CORS:** required  
**Auth:** required  
**Risk:** high-impact externally (controls distribution); requires rate limiting.

#### Request

```json
{
  "product": "terminal-pro",
  "version": "1.0.0",
  "platform": "windows"
}
```

**Allowed values:**
- `platform`: `"linux-appimage" | "linux-deb" | "windows" | "macos"`
- `version`: semver string

#### Response (200)

```json
{
  "ok": true,
  "token": "dl_abc123",
  "expiresAt": "2026-02-05T11:00:00Z",
  "urls": {
    "windows": "https://www.rinawarptech.com/downloads/RinaWarp-Terminal-Pro-1.0.0.exe?token=dl_abc123"
  }
}
```

#### Errors

| Status | Body |
|--------|------|
| 401 | `{ "ok": false, "error": "unauthorized" }` |
| 402 | `{ "ok": false, "error": "payment_required" }` |
| 403 | `{ "ok": false, "error": "forbidden" }` |
| 429 | `{ "ok": false, "error": "rate_limited" }` |

---

### 2.5 POST /api/portal
Create a billing portal session URL (Stripe or equivalent).

**Browser CORS:** required  
**Auth:** required

#### Response (200)

```json
{
  "ok": true,
  "url": "https://billing.example.com/session/..."
}
```

**Rules:**
- `url` must be https
- allowlist hostnames

#### Errors

| Status | Body |
|--------|------|
| 401 | `{ "ok": false, "error": "unauthorized" }` |
| 500 | `{ "ok": false, "error": "portal_unavailable" }` |

---

## 3) Redirect & Website Integration

### 3.1 Website login flow (canonical)

1. User enters email on `/login/` or `/signup/`
2. Website calls `POST /api/auth/start`
3. User clicks magic link -> goes to website `/login/?token=...`
4. Website calls `GET /api/auth/verify?token=...`
5. API returns redirect (default `/account/`)
6. Website navigates to redirect

### 3.2 Legacy token paths

Website may normalize:
- `/login/<token>/` → `/login/?token=<token>`
- `/qzje/<token>/` → `/login/?token=<token>`

These are presentation only; backend remains the same.

---

## 4) Security & Abuse Controls

### 4.1 Rate limiting (minimums)

| Endpoint | Limit |
|----------|-------|
| `/api/auth/start` | 5/min/email, 20/min/IP |
| `/api/auth/verify` | 10/min/IP |
| `/api/download-token` | 10/hour/user |

### 4.2 Token properties

Magic link token must be:
- opaque
- short-lived (15–30 minutes)
- single-use (recommended)
- bound to email

### 4.3 Logging (privacy-safe)

**Log:**
- request id
- endpoint
- result ok/error
- minimal user id (not raw token)

**Do not log:**
- magic tokens
- session cookies
- secrets

---

## 5) Reference Fetch Snippets

### 5.1 Browser: start auth

```javascript
await fetch("https://api.rinawarptech.com/api/auth/start", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email, mode: "login" })
});
```

### 5.2 Browser: verify token (cookie session)

```javascript
await fetch(`https://api.rinawarptech.com/api/auth/verify?token=${encodeURIComponent(token)}`, {
  method: "GET",
  credentials: "include"
});
```

### 5.3 Browser: /me

```javascript
await fetch("https://api.rinawarptech.com/api/me", {
  method: "GET",
  credentials: "include"
});
```

---

## 6) Compatibility Notes (Electron App)

Electron can call the same endpoints. If using cookies, ensure the Electron session partition is stable and requests include credentials. If using bearer tokens, store token securely (OS keychain recommended).

---

## 7) Versioning

This contract is for v1.0.0

Any breaking change requires:
1. updating this doc
2. bumping API version OR compatibility guard
3. updating both website + app together
