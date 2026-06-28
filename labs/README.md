# Labs

Each lab is a **challenge** that teaches one vulnerability as a *progression of
stages*: you start at the naive version and "level up", and at each stage the
code changes a bit — a stronger but still-bypassable defense is added — until a
final, correctly-fixed version. Standard depth is **3 vulnerable stages + 1 fixed**.

> **Tier vs. Stage.** *Tier* (the `level` field, 1–5) is the curriculum band the
> challenge sits in on the dashboard (Basics, Auth, …). *Stage* is a sub-level
> **within** a challenge.

## Structure

```
NN-name/
├── lab.json          # metadata + stages[] (auto-read by the hub dashboard)
├── README.md         # the writeup: per-stage vuln · bypass · root cause · fix
├── app/
│   ├── server.js     # auto-discovers stages/, mounts them, renders the menu
│   ├── shared.js     # UI + (for DB labs) seed/query helpers — NOT vuln logic
│   ├── package.json
│   ├── Dockerfile
│   └── stages/
│       ├── 01-naive.js     # the unguarded vulnerable pattern
│       ├── 02-*.js         # stronger-but-bypassable defense
│       ├── 03-*.js         # stronger still, still bypassable
│       └── 04-fixed.js     # the correct fix (status: "secure")
├── exploit/          # node:test PoCs: each vuln stage exploitable, fixed resists all
│   ├── package.json
│   └── *.test.js
└── docker-compose.yml
```

Mounts: vulnerable stages → `/stage/<n>`, the secure stage → `/fixed`, menu → `/`.
Each stage page shows the login/feature UI, the runtime effect (e.g. executed
query), and a collapsible **Vulnerable source** panel of that stage's own file.

**Reference implementation:** [`01-sqli`](01-sqli/) is the canonical example — copy its shape.

## The stage module contract

Each `app/stages/NN-slug.js` exports:

```js
module.exports = {
  stage: 1,                       // number, drives ordering + mount
  slug: 'naive',                  // short id
  title: 'Naive implementation',  // shown in menu/nav/page
  defense: 'None — the baseline.',// NEUTRAL one line: what guard is added, NOT its flaw
  hint: "Look at how the quote is removed…",  // nudge, shown only via the Hint button
  explanation: "Your <code>'</code> closed the string early…",  // "why it worked", shown only after a success (HTML ok)
  lesson: 'Input concatenated into SQL becomes code.',          // short takeaway, used in the fixed-stage recap table
  status: 'vulnerable',           // 'vulnerable' | 'secure'  (exactly one 'secure')
  createRouter(SQL, ctx) {        // ctx = {stage,slug,title,defense,hint,explanation,status,mount,filePath,allStages,recap}
    const r = require('express').Router();
    // ... build GET / and the action handler; render via shared.stagePage(ctx, {...})
    return r;                     // each stage owns its OWN db (no globals)
  },
};
```

**Spoiler policy (don't give the answer away):** the challenge is to find the bug
yourself, so the source panel hides the explanation. Mark the security-relevant
line with a trailing `//!` comment — `sourcePanel()` highlights that line but
strips the `//!` text from the display (the full file on GitHub keeps it). Put the
nudge in `hint` (revealed via a button) and the full "why it worked" in
`explanation` (revealed only after a successful exploit). Keep `defense` neutral.

**Golden rule:** consecutive stage files must differ by the *minimum* code, so
`git diff stages/01-naive.js stages/02-*.js` reads as the lesson.

The lab-level recap on the fixed page comes from `lab.json`: add `rootCause`
(one-line vuln definition) and `lessons` (string[] bullets).

## Create a new challenge

Use the **`new-challenge`** skill (preferred — scaffolds the full tree, lab.json,
stages, exploit test, and ticks the README map). The old `scripts/new-lab.sh`
predates the stage structure.

To add a stage to an existing challenge, use the **`new-stage`** skill.

## The lab.json schema

| field | type | notes |
|-------|------|-------|
| `id` | string | folder name, e.g. `01-sqli` |
| `title` | string | display name |
| `level` | number | **Tier** 1–5 (dashboard grouping) |
| `owasp` | string | OWASP category (optional) |
| `category` | string | vuln family |
| `difficulty` | `easy`\|`medium`\|`hard` | |
| `status` | `todo`\|`in-progress`\|`done` | drives the dashboard dot |
| `port` | number | port the lab app listens on |
| `summary` | string | one-liner |
| `tags` | string[] | for filtering |
| `stages` | object[] | `{stage, slug, title, defense, status}` per stage — must match the modules on disk |
