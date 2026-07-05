# Lab 17 — Mass Assignment

| | |
|---|---|
| **Tier** | 4 — Config & Crypto |
| **OWASP** | A08:2021 – Software and Data Integrity Failures |
| **Difficulty** | medium |
| **Stages** | 5 vulnerable + 1 fixed |

## 🎯 The scenario
A profile-update endpoint merges the JSON you send into your user object. Set a
**privileged field** you were never meant to touch and make your account an admin.

> A stage is solved when your account becomes admin (the secret appears). Send the patch
> as JSON in the `data` field.

## 🧠 The one idea
Bind only an **explicit allowlist** of user-editable fields. Merging the request body —
or denylisting "bad" fields — always leaves a way to set `role` / `isAdmin` / `groups`.

---

## Stage 1 — Full-body merge · `/stage/1`
`Object.assign(user, body)`. **Exploit:** `{"role":"admin"}`.

## Stage 2 — Blacklists the wrong field · `/stage/2`
`delete body.role`, but admin is `isAdmin`. **Exploit:** `{"isAdmin":true}`.

## Stage 3 — Nested field via deep merge · `/stage/3`
Top-level `role`/`isAdmin` stripped; recursive merge. **Exploit:** `{"account":{"role":"admin"}}`.

## Stage 4 — Incomplete denylist · `/stage/4`
Strips `role`/`isAdmin` everywhere, but not `groups`. **Exploit:** `{"groups":["admins"]}`.

## Stage 5 — Allowlist with a mistaken field · `/stage/5`
`['name','email','bio','role']` — `role` slipped in. **Exploit:** `{"role":"admin"}`.

## Stage 6 — Strict field allowlist · `/fixed`
```js
const EDITABLE = ['name', 'email', 'bio'];
for (const k of EDITABLE) if (k in patch) user[k] = patch[k];   // 🟢
```
`role`, `isAdmin`, nested fields, and `groups` can't be set. Privilege changes go through
a separate authorized endpoint.

### ✅ Takeaways
- Allowlist the exact fields a user may edit; ignore everything else.
- Never deep-merge or `Object.assign` an untrusted body onto a domain object.
- Keep privilege changes on a dedicated, authorized path.

## ▶️ Run it
```bash
npm run dev                              # → http://localhost:4017
# or: cd labs/17-mass-assignment && docker compose up
```

## 🧪 Tests
```bash
cd exploit && npm install && npm test
```
Each vulnerable stage must grant admin via a privileged field; `/fixed` must ignore them
all while still saving a normal edit.
