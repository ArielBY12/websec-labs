---
name: new-challenge
description: Scaffold a brand-new WebSec Labs challenge from the template — creates labs/<id>/ with lab.json (stages[]), the app/ skeleton (server + shared + naive stage + fixed stage), an exploit test, docker-compose, and a README, then ticks the root README vuln map. Use when the user wants to add a new vulnerability lab (e.g. "add an XSS lab", "create the SSRF challenge").
---

# new-challenge

Create a complete new challenge following the repo's stage structure. The standard
depth is **3 vulnerable stages + 1 fixed**, but scaffold at least stage 1 + fixed
and use `new-stage` to fill in the middle.

## Steps
1. **Read** `CLAUDE.md` and `labs/01-sqli/` (the reference). Pick:
   - `id` (e.g. `09-xss-stored`), `title`, `level` (Tier 1–5), `owasp`, `category`,
     `difficulty`, a free `port` (check other labs' `lab.json` to avoid clashes),
     `tags`, `summary`.
2. **Copy the template:** `cp -R labs/_template labs/<id>` (or recreate the tree).
   Then in `labs/<id>/`:
   - Fill `lab.json` (id, metadata, `stages[]`).
   - Rename `app/package.json` and `exploit/package.json` names to `lab-<id>(-exploit)`.
   - Set the `port` in `app/Dockerfile` EXPOSE and `docker-compose.yml`.
3. **Build the stages** in `app/stages/`:
   - `01-naive.js` — the unguarded vulnerable feature. Keep the insecure line
     marked 🔴 and on its own line.
   - `NN-fixed.js` — `status: "secure"`, the correct mitigation.
   - For DB labs, add seed/query helpers to `app/shared.js` (see 01-sqli).
   - Render everything via `shared.stagePage(ctx, {...})`.
4. **Write the exploit test** (`exploit/*.test.js`) from the template: PoCs that
   exploit each vulnerable stage; assert `/fixed` resists all; drift guard.
5. **Write `README.md`** (writeup) following the template.
6. **Tick the root `README.md`** vulnerability map checkbox for this lab.
7. **Verify:** `cd app && npm install && npm start` (smoke test the menu + a PoC),
   then run `verify-lab`.
8. Use **`new-stage`** to add stages 2 and 3 between naive and fixed.

## Guardrails
- Each stage owns its own DB; no global state.
- Keep stage files minimal and readable (shown to the learner).
- Don't deploy; local/Docker only.
