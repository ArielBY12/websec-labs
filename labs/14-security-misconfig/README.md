# Lab 14 — Security Misconfiguration

| | |
|---|---|
| **Tier** | 4 — Config & Crypto |
| **OWASP** | A05:2021 – Security Misconfiguration |
| **Difficulty** | medium |
| **Stages** | 5 vulnerable + 1 fixed |

## 🎯 The scenario
The same app is deployed five ways, each leaking a server secret (`MISCONFIG{…}`)
through a different misconfiguration. Recover the secret; then see a hardened deployment
close them all.

> Unlike the other labs, these five stages are *independent* misconfigurations rather
> than progressive filters — that's the nature of the category. Each teaches a distinct
> deployment mistake.

## 🧠 The one idea
Most breaches aren't clever exploits — they're **left-open doors**: a debug route,
verbose errors, an exposed `.env`, a default password, an unauthenticated internal
endpoint. Secure defaults and least exposure close them.

---

## Stage 1 — Debug endpoint enabled · `/stage/1`
`GET /debug` dumps the running config. **Exploit:** `GET /debug`.
**Root cause:** development conveniences shipped to production.

## Stage 2 — Verbose error responses · `/stage/2`
`POST /parse` returns the internal config on failure. **Exploit:** send invalid JSON.
**Root cause:** detailed errors expose internals; keep them in logs.

## Stage 3 — Exposed dotfile · `/stage/3`
The static server hands out `.env`. **Exploit:** `GET /static/.env`.
**Root cause:** serving the whole web root leaks dotfiles/backups.

## Stage 4 — Default credentials · `/stage/4`
The admin panel still uses `admin/admin`. **Exploit:** log in with the defaults.
**Root cause:** shipped credentials never changed.

## Stage 5 — Unauthenticated internal endpoint · `/stage/5`
`GET /internal/config` has no auth. **Exploit:** just request it.
**Root cause:** relying on network isolation instead of authentication.

## Stage 6 — Hardened deployment · `/fixed`
Debug route removed, generic errors, public-allowlist static serving (no dotfiles),
changed admin password, and a token-authenticated internal endpoint. Every leak is
closed; `GET /health` still works.

### ✅ Takeaways
- Turn off debug/diagnostics and verbose errors in production.
- Serve an explicit public directory only.
- Change default credentials; authenticate every sensitive endpoint.
- Treat "internal-only" endpoints as internet-reachable.

## ▶️ Run it
```bash
npm run dev                              # → http://localhost:4014
# or: cd labs/14-security-misconfig && docker compose up
```

## 🧪 Tests
```bash
cd exploit && npm install && npm test
```
Each vulnerable stage must leak the secret; `/fixed` must close all five while `/health`
still works.
