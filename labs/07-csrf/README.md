# Lab 07 — Cross-Site Request Forgery

| | |
|---|---|
| **Tier** | 2 — Auth & Access |
| **OWASP** | A01:2021 – Broken Access Control |
| **Difficulty** | medium |
| **Stages** | 5 vulnerable + 1 fixed |

## 🎯 The scenario
You are logged in as **alice** on a small bank app. Her account page has a **legitimate,
same-site change-email form** — *and* an **🎭 attacker's page** that plays the malicious
payload a real evil site would host. The goal: get the **cross-site** request (from the
attacker's page) to change alice's email to `attacker@evil.example`.

> A stage is solved only when the change arrives as a **cross-site request** — modelled
> by a request that carries alice's cookie but **no same-site Referer**. The attacker's
> console lets you pick the **delivery origin** (same-site / cross-site `evil.example` /
> stripped Referer); it defaults to *same-site*, which is alice's own legitimate action and
> never counts, so a blind click solves nothing — you must consciously forge it cross-site.
> The fixed stage must reject every cross-site attack while still accepting alice's own
> submission — that's what the tests assert.

## 🧠 The one idea
Browsers attach the session **cookie automatically** to every request to an origin —
including one triggered by a different site (a hidden form, an `<img>`, a link). So the
cookie proves the user is **logged in**, never that the user **intended** the request.
The only thing that stops forgery is a value the attacker **cannot know or send**: an
unpredictable, per-session token that the server verifies on every state change.

---

## Stage 1 — No CSRF protection · `/stage/1`
The change runs on the strength of the session cookie alone.

```js
sess.email = req.body.email;   // 🔴 no token required
```

**Exploit:** POST to `/change-email` with `email=attacker@evil.example` and alice's
session cookie. No token, no Referer needed.
**Root cause:** authentication ≠ intent. A state-changing request needs an
unpredictable token.

## Stage 2 — Token rendered, never checked · `/stage/2`
The form now contains a hidden `csrf` field, so it *looks* protected.

```js
// form renders <input name="csrf" value="...">
sess.email = req.body.email;   // 🔴 the token is never compared to anything
```

**Exploit:** forge the request **without** the token field (or with any junk value) — it
still succeeds.
**Why it fails:** rendering a token is not validating it. Security theater.

## Stage 3 — Static site-wide token · `/stage/3`
The token is finally verified — but it's one constant baked into the site, identical for
every user.

```js
if (req.body.csrf !== 'csrf-shared-2024') return deny;   // 🔴 not tied to the session
```

**Exploit:** read the token from your **own** copy of the page (or any user's) and reuse
it — it's the same value that validates alice's request.
**Why it fails:** a token must be unpredictable **and** bound to the session. A shared
constant is known to every attacker.

## Stage 4 — Token checked only on POST · `/stage/4`
A proper per-session token is verified on POST. But the same action is also exposed over
GET for "convenience".

```js
r.get('/change-email', (req, res) => { sess.email = req.query.email; });  // 🔴 no token check
r.post('/change-email', (req, res) => { if (req.body.csrf !== sess.token) deny; ... });
```

**Exploit:** `<img src="/change-email?email=attacker@evil.example">` on any page — the
browser fires the GET with alice's cookie and no token.
**Why it fails:** the check must cover **every** state-changing method, and state changes
must never be reachable over GET.

## Stage 5 — Referer-based defense · `/stage/5`
No token this time — the server accepts the POST only if the `Referer` header's host is
same-site, **but it also allows an absent Referer**.

```js
const ok = !ref || new URL(ref).host === req.headers.host;   // 🔴 no Referer → allowed
```

**Exploit:** a `cross-site (evil.example)` delivery is rejected (its Referer host isn't
same-site), so deliver the request with **no** `Referer` — a `no-referrer` fetch, a
`rel="noreferrer"` link, `<meta name="referrer" content="no-referrer">`, or an HTTPS→HTTP
downgrade. (In the console, pick the **🚫 No Referer (stripped)** delivery origin.)
**Why it fails:** a Referer check is a fragile add-on — the header is routinely absent, and
attackers can force it. It's no substitute for a per-session token.

## Stage 6 — Per-session token, verified · `/fixed`
Require the session's own unpredictable token on every state change, compared in constant
time; GET performs no change; the cookie is `SameSite=Strict`.

```js
if (!req.body.csrf || !safeEqual(req.body.csrf, sess.token)) return deny;   // 🟢
sess.email = req.body.email;
```

Every earlier forgery — no token, unchecked token, static token, the GET trick, an absent
Referer — fails, because none of them carries alice's own token, which the same-origin
policy prevents an attacker from reading. Only alice's genuine form submission works.

> **In the browser:** each vulnerable stage shows an **🎭 attacker's page** where you
> assemble the request — its **delivery origin**, method, and token — carrying alice's
> cookie. It defaults to *same-site* (a legitimate action that never solves), so you must
> deliberately send it **cross-site** to forge. Stage 5 is the instructive one: a
> `cross-site (evil.example)` delivery is **rejected**, and you have to discover that a
> **stripped Referer** slips through. Clicking alice's own **Update email** form is always
> a legitimate same-site request. On `/fixed`, every forged delivery is rejected.

### ❌ Common wrong "fixes" (and why they fail)
- **Putting a token in the form** but not verifying it server-side — Stage 2.
- **A single app-wide token** not tied to the session — Stage 3.
- **Checking the token on POST only** while a GET route mutates state — Stage 4.
- **Trusting `Referer`/`Origin`** with a substring match or an allow-if-absent rule — Stage 5.
- **Comparing tokens with `==`** (timing leak) instead of a constant-time compare.

### ✅ Takeaways
- Bind an **unpredictable token to the session**; verify it on **every** state-changing
  request in **constant time**.
- Make state changes **POST-only** — never mutate state on GET.
- Add **`SameSite`** cookies as defense-in-depth so the browser won't attach the session
  cross-site in the first place.

## ▶️ Run it
```bash
# from the repo root — runs the hub + every lab, including this one
npm run dev                              # → http://localhost:4007

# or just this lab in Docker
cd labs/07-csrf && docker compose up
```
Open `/`, pick a stage, read its source, and try to forge the email change — then watch
`/fixed` reject every forgery while alice's own submission still works.

## 🧪 Tests
```bash
cd exploit && npm install && npm test
```
Each vulnerable stage must be forgeable (no token, unchecked token, static token, GET
trick, spoofed Referer); `/fixed` must reject all of them while still accepting alice's
genuine, token-bearing request.
