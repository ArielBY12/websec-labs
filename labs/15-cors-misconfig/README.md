# Lab 15 — CORS Misconfiguration

| | |
|---|---|
| **Tier** | 4 — Config & Crypto |
| **OWASP** | A05:2021 – Security Misconfiguration |
| **Difficulty** | medium |
| **Stages** | 5 vulnerable + 1 fixed |

## 🎯 The scenario
`GET /api/account` returns account data and sets `Access-Control-Allow-Origin` based on
the request's `Origin`, with `Allow-Credentials: true`. Get an **untrusted** origin
allowed to read the credentialed response — the CORS bypass a malicious site uses to
steal data with the victim's cookies.

> A stage is solved when an attacker origin receives an ACAO that makes the response
> cross-origin readable. Use the `/check` form (or send an `Origin` header to
> `/api/account`).

## 🧠 The one idea
`Access-Control-Allow-Origin` must be an **exact** member of a small allowlist. Any
computed match — reflection, `startsWith`, `endsWith`, a regex, or `null` — can be
satisfied by an attacker-controlled origin.

---

## Stage 1 — Reflects any Origin · `/stage/1`
```js
const acao = origin || null;   // 🔴 echoes anything
```
**Exploit:** any origin, e.g. `https://evil.attacker.com`.

## Stage 2 — startsWith allowlist · `/stage/2`
```js
origin.startsWith('https://bank.example')   // 🔴
```
**Exploit:** `https://bank.example.evil.com`.

## Stage 3 — endsWith allowlist · `/stage/3`
```js
origin.endsWith('bank.example')   // 🔴
```
**Exploit:** `https://evilbank.example`.

## Stage 4 — Unescaped-dot regex · `/stage/4`
```js
/^https:\/\/bank.example$/.test(origin)   // 🔴 . matches any char
```
**Exploit:** `https://bankxexample`.

## Stage 5 — Trusts the null origin · `/stage/5`
```js
new Set([TRUSTED, 'null']).has(origin)   // 🔴
```
**Exploit:** `Origin: null` (sandboxed iframe / redirect).

## Stage 6 — Exact-string origin allowlist · `/fixed`
```js
new Set(['https://bank.example', 'https://app.bank.example']).has(origin)   // 🟢
```
Reflection, prefix/suffix, regex, and null are all denied; the real front-end still gets
a valid ACAO.

### ✅ Takeaways
- Match `Origin` for exact equality against a known allowlist.
- Never reflect a computed origin; never allowlist `null`; never use `*` with credentials.
- Prefer same-site architecture where possible.

## ▶️ Run it
```bash
npm run dev                              # → http://localhost:4015
# or: cd labs/15-cors-misconfig && docker compose up
```

## 🧪 Tests
```bash
cd exploit && npm install && npm test
```
Each vulnerable stage must let an attacker origin read the response; `/fixed` must deny
them all while allowing the real front-end origin.
