# Lab 05 — Broken Access Control (privilege escalation)

| | |
|---|---|
| **Tier** | 2 — Auth & Access |
| **OWASP** | A01:2021 – Broken Access Control |
| **Difficulty** | medium |
| **Stages** | 3 vulnerable + 1 fixed |

## 🎯 The scenario
You're logged in as **alice**, a regular `user`. The app has an admin-only panel at
`/admin` that lists every user and can **promote** anyone to admin. Your dashboard
doesn't show a link to it — but that's just the UI. The question is whether the
*server* stops a regular user from reaching admin functionality.

This is **vertical** access control (reaching a higher-privilege *function*), the
sibling of Lab 03's IDOR, which was **horizontal** (reaching another user's *object*).

> A stage is exploited when alice reaches the admin panel or runs the promote
> action. The fixed stage must deny all of that (deny by default) while still
> serving alice her normal dashboard — that's what the tests assert.

## 🧠 The one idea
Every privileged endpoint must check, **on the server, against the authenticated
session**, that the caller is allowed — *before* doing the work. Hiding the link,
trusting a client value, or checking only some routes all leave the function exposed
to a direct request.

---

## Stage 1 — No access check · `/stage/1`
The panel is served to anyone; only the UI hides the link.

```js
r.get('/admin', (req, res) => res.send(adminPanel(...)));   // 🔴 no check at all
```

**Exploit:** browse straight to `/stage/1/admin` (forced browsing).
**Root cause:** missing function-level access control — the endpoint authorizes
nothing.

## Stage 2 — Trust a client role cookie · `/stage/2`
A real check is added — but the role comes from a cookie the **client** sends.

```js
const role = cookie(req, 'role');
if (role !== 'admin') return denied;   // role is attacker-controlled
```

**Exploit:** send `Cookie: role=admin` with the request to `/stage/2/admin`.
**Why it fails:** the server trusted a value the client controls instead of its own
session (where you're still `user`). Cookies, headers, and hidden fields are all
attacker-controlled.

## Stage 3 — Guards the page, not the action · `/stage/3`
The role is now read from the trusted session, and the `/admin` **page** correctly
denies you. But the **action** endpoint was left unchecked.

```js
// GET /admin         → checks SESSION.role === 'admin'  ✅
// POST /admin/promote → no check  ❌
```

**Exploit:** `POST /stage/3/admin/promote` directly (the page denies you, the action
doesn't).
**Why it fails:** attackers call the action endpoint directly — they don't need the
page. State-changing endpoints need the check too.

## Stage 4 — Deny-by-default authorization · `/fixed`
One middleware guards the whole `/admin` subtree, from the session, deny by default.

```js
const requireAdmin = (req, res, next) =>
  SESSION.role === 'admin' ? next() : denied();
r.use('/admin', requireAdmin);   // 🟢 runs before the page AND every action under /admin
```

Forced browsing, a forged cookie, and the direct action all hit `requireAdmin` first
and are denied, while the regular-user dashboard at `/` keeps working.

### ❌ Common wrong "fixes" (and why they fail)
- **Hiding the link / disabling the button** — the endpoint is still reachable.
- **Trusting `role` from a cookie/header/JWT-claim the client can set** — forge it.
- **Checking only the page, or a per-path list** — the action / a new sub-route slips.
- **Client-side checks** (JS that redirects non-admins) — bypassed by calling the API.

### ✅ Takeaways
- Authorize **every** privileged endpoint **server-side**, against the **session**.
- Prefer one **central, deny-by-default** guard over the whole privileged area.
- Protect **actions**, not just views.

## ▶️ Run it
```bash
# from the repo root — runs the hub + every lab, including this one
npm run dev                              # → http://localhost:4005

# or just this lab in Docker
cd labs/05-broken-access-control && docker compose up
```
Open `/` for the stage menu, read each stage's source, and try to reach `/admin` (or
promote alice) — then watch `/fixed` deny every route while the dashboard still works.

## 🧪 Tests
```bash
cd exploit && npm install && npm test
```
Each vulnerable stage must let alice reach admin functionality; `/fixed` must deny all
three PoCs while still serving the regular-user dashboard.
