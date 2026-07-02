# CLAUDE.md — WebSec Labs

Guidance for Claude (and humans) working in this repo. Read this before editing labs.

## Purpose & golden rule
An educational collection of **intentionally vulnerable** web labs teaching the
OWASP Top 10 and other well-known web vulnerabilities. Each lab is a learning
artifact, not production code.

> 🔒 **Golden rule:** this code is *meant* to be vulnerable. Run it locally or in
> Docker only — never deploy it anywhere public. Do not "secure" vulnerable code
> (see guardrails below).

## Terminology
- **Tier** — the curriculum band a challenge sits in on the dashboard (1–5:
  Basics, Auth & Access, Injection+, Config & Crypto, Advanced). Stored in the
  `lab.json` `level` field. **Do not rename `level`** — the hub sorts/groups on it.
- **Stage** — a progressive sub-level *within* a challenge. Each stage adds one
  stronger-but-still-bypassable defense; the final stage is the real fix.
  `status: "vulnerable" | "secure"`. Exactly one `secure` stage per challenge.
- **Minimum depth:** at least **5 vulnerable stages + 1 fixed**, ordered by ascending
  difficulty, where **each stage teaches a distinct new principle** (no two stages the
  same lesson). The first stage may be the unguarded baseline; later stages should
  reach PortSwigger-medium. Labs predating this rule may have fewer.

## Repository layout
```
hub/                 Express dashboard; auto-discovers labs from labs/<id>/lab.json
labs/<id>/           one challenge
  lab.json           metadata + stages[]  (the hub reads this)
  README.md          the writeup (per-stage vuln · bypass · root cause · fix)
  app/               the running app
    server.js        discovers stages/, mounts /stage/<n> + /fixed, renders menu /
    shared.js        UI helpers (+ DB seed/query helpers for DB labs). NO vuln logic here.
    stages/NN-slug.js  one stage each — THIS is where the vuln/defense lives
  exploit/           node:test PoCs (each vuln stage exploitable; fixed resists all)
  docker-compose.yml
labs/_template/      copyable skeleton
scripts/             helpers (new-lab.sh predates stages — prefer the new-challenge skill)
.github/workflows/   CI runs every exploit/ test
```
**Reference implementation:** `labs/01-sqli/` — copy its shape for new labs.

## The stage module contract
Each `app/stages/NN-slug.js` exports `{ stage, slug, title, defense, hint,
explanation, lesson, status, createRouter(SQL, ctx) }`. `createRouter` returns an
Express router and **owns its own DB** (call `shared.seedUsers(SQL)` — no global
state shared between stages). `ctx` carries `{stage, slug, title, defense, hint,
explanation, status, mount, filePath, allStages, recap}`; `filePath` powers the
in-page source panel; `recap` (on the secure stage) holds the lab's `rootCause` +
`lessons` from `lab.json`.

Field meanings (kept deliberately separate so the lab doesn't spoil itself):
- `defense` — **neutral** one-liner: what guard was added, NOT its flaw. Shown always.
- `hint` — the nudge, shown only inside the collapsed **Hint** button.
- `explanation` — the detailed "why it worked", shown only **after a successful
  exploit** (trusted HTML allowed).
- `lesson` — short takeaway, used in the fixed-stage recap table.

Render every page through `shared.stagePage(ctx, { content, result })` so all stages
get the banner, nav, neutral defense line, hint button, source panel, success
explanation, and (on the fixed stage) the recap for free.

**Spoiler policy — `//!` tag.** Mark the security-relevant line with a trailing
`//!` comment. `sourcePanel()` highlights that line but **strips the `//!` text**
from the displayed code, so the app shows clean code while the file on GitHub still
explains itself. Never put the giveaway in a plain comment or in `defense`.
Mounts: vulnerable stages → `/stage/<n>`, secure → `/fixed`.

## Interactive teaching workflow
When teaching a lab with the user, go stage by stage:
1. **Show & explain** the current stage's insecure pattern (the marked line).
2. **Let the user attempt** the bypass themselves — give hints, not the answer.
3. **Reveal the root cause** once they've tried.
4. **Introduce the next stage's defense** (a new naive fix → a new bypass). Repeat.
5. **Finish at `/fixed`**, then write/refresh the README writeup and the exploit test.

The `teach-lab` skill drives this; `new-stage` adds a stage; `new-challenge`
scaffolds a whole lab; `verify-lab` checks everything before commit.

## Security guardrails (the subtle ones)
- **Never harden a stage that's meant to be bypassable.** If you think of a
  defense, it becomes the *next* stage — it does not get added to the current one.
- **Only the `secure` stage resists all PoCs.** Every other stage must remain
  exploitable; the exploit test enforces this.
- **Verbose errors and the "executed query" panel are intentional** teaching aids,
  not bugs to fix.
- **Secrets are fake fixtures** (e.g. seeded passwords). Keep them obviously fake;
  never add real credentials.
- **Keep stage files short and readable** — they are shown to the learner in the
  source panel, so noise hurts the lesson. Mark the key line with a `//!` spoiler
  tag (stripped from the display, kept on GitHub).

## Tech choices (and why)
- **`sql.js`** (SQLite compiled to WASM) for DB labs: a real SQL engine so
  injection is real, but no native build step → runs anywhere, trivial Docker.
- **Express + raw HTML strings** (no front-end framework): frameworks auto-escape
  and would hide the very vulnerabilities we teach.
- **`node:test`** (built-in) for exploit tests: zero dependencies, runs with
  `node --test`, clean in CI.

## Hub discovery contract
Drop a `labs/<id>/lab.json` in and the hub lists it automatically. Required-ish
fields: `id, title, level, status, port`; `stages[]` powers the detail page at
`/lab/:id`. `lab.json.stages` must match the stage modules on disk — the exploit
test asserts this (drift guard).

## Conventions
- Stage files: `NN-slug.js`, zero-padded, ordered by `stage`.
- Keep `lab.json.stages` in sync with `app/stages/` (CI checks it).
- A lab's CI must stay green: vuln stages exploitable, `fixed` resists all, valid
  input still works.
- When a lab is finished, set its `lab.json` `status` to `done` and tick its box
  in the root `README.md` vulnerability map.
- **Commits/pushes:** only when the user asks. The `.github/workflows/ci.yml` needs
  the GitHub token's `workflow` scope to push (`gh auth refresh -s workflow`).
