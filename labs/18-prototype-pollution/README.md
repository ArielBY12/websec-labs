# Lab 18 — Prototype Pollution

| | |
|---|---|
| **Tier** | 4 — Config & Crypto |
| **OWASP** | A08:2021 – Software and Data Integrity Failures |
| **Difficulty** | hard |
| **Stages** | 5 vulnerable + 1 fixed |

## 🎯 The scenario
A preferences feature merges the JSON you send into a settings object. Pollute
`Object.prototype` so a freshly-created `{}` inherits a property you control (the classic
first step to auth bypass / RCE gadgets).

> A stage is solved when a probe `const probe = {}` shows your gadget key defined. Send
> payloads as raw JSON (a JS object literal `{__proto__:…}` would set the prototype
> instead of a key).

## 🧠 The one idea
Merging/assigning untrusted **keys** lets `__proto__` (or `constructor.prototype`) reach
`Object.prototype` and mutate it for every object. Reject those keys by exact match at
**every** level — or don't use plain objects for untrusted data.

---

## Stage 1 — Unguarded recursive merge · `/stage/1`
**Exploit:** `{"__proto__":{"pp1":true}}`.

## Stage 2 — Blocks __proto__ only · `/stage/2`
`if (k === '__proto__') continue`. **Exploit:** `{"constructor":{"prototype":{"pp2":true}}}`.

## Stage 3 — Top-level key check only · `/stage/3`
Checks depth 0 only. **Exploit:** `{"x":{"__proto__":{"pp3":true}}}`.

## Stage 4 — Non-recursive key sanitize · `/stage/4`
`k.replace('__proto__','')`. **Exploit:** `{"__pro__proto__to__":{"pp4":true}}` — the strip re-forms the key.

## Stage 5 — Dotted-path assignment sink · `/stage/5`
A `lodash.set`-style setter. **Exploit:** `POST /set` with `path=__proto__.pp5`, `value=true`.

## Stage 6 — Reject dangerous keys everywhere · `/fixed`
```js
const BAD = new Set(['__proto__', 'constructor', 'prototype']);
for (const k of Object.keys(p)) { if (BAD.has(k)) continue; /* recurse/assign */ }   // 🟢
```
Direct, nested, `constructor.prototype`, and reconstitution payloads all fail; a normal
merge still works.

### ✅ Takeaways
- Reject `__proto__`/`constructor`/`prototype` by exact match at every depth (don't strip).
- Prefer `Object.create(null)` objects or `Map` for untrusted data; `Object.freeze(Object.prototype)` as defense-in-depth.
- Guard every sink — merges *and* dotted-path setters.

## ▶️ Run it
```bash
npm run dev                              # → http://localhost:4018
# or: cd labs/18-prototype-pollution && docker compose up
```

## 🧪 Tests
```bash
cd exploit && npm install && npm test
```
Each vulnerable stage must pollute `Object.prototype` (distinct gadget keys avoid
cross-contamination); `/fixed` must reject every vector while still merging normally.
