# Lab 21 — Insecure Deserialization

| | |
|---|---|
| **Tier** | 5 — Advanced |
| **OWASP** | A08:2021 – Software and Data Integrity Failures |
| **Difficulty** | hard |
| **Stages** | 5 vulnerable + 1 fixed |

## 🎯 The scenario
A "restore preferences" feature deserializes a token back into an object. Get code to run
**during deserialization** and read `global.__DESER_FLAG__` — remote code execution.

> ⚠️ The deserializer intentionally `eval`s a function marker (like `node-serialize`) so
> the RCE is real. Local learning only.

## 🧠 The one idea
Deserializing untrusted input with any format that can carry **code** (or revive
dangerous **types**) is RCE. Parse untrusted data as plain data (`JSON.parse`, no
reviver) and validate a strict schema.

---

## Stage 1 — Function-marker eval · `/stage/1`
`{"x":"_$$ND_FUNC$$_function(){…}()"}` — the marker is eval'd; `()` runs it.

## Stage 2 — Blacklist on the serialized bytes · `/stage/2`
Blocks the marker string. **Bypass:** write it with `_` escapes — the raw text lacks the marker, the parsed value has it.

## Stage 3 — Strips functions after parsing · `/stage/3`
Deletes function values post-parse. **Bypass:** an IIFE ran *during* parse and returns data, not a function.

## Stage 4 — Signed with a weak/known key · `/stage/4`
Verifies an HMAC signature with key `s3cret`. **Bypass:** sign your own payload with the known key.

## Stage 5 — Type allowlist with a gadget · `/stage/5`
Revives only allowlisted `__type`s — but `Template` evals its `src`. **Bypass:** `{"__type":"Template","src":"…"}`.

## Stage 6 — Plain JSON + schema validation · `/fixed`
```js
const raw = JSON.parse(token);            // no reviver
const clean = {}; for (const k of ['theme','name','lang']) if (typeof raw?.[k] === 'string') clean[k] = raw[k];   // 🟢
```
Markers, `__type` tags, IIFEs, forged signatures, and gadgets are all inert; normal
preferences load.

### ✅ Takeaways
- Never deserialize untrusted data with a code-carrying format or custom reviver.
- `JSON.parse` with no reviver, then validate a strict allowlist schema.
- Signatures need secret, strong keys — and still aren't a substitute for safe parsing.

## ▶️ Run it
```bash
npm run dev                              # → http://localhost:4021
# or: cd labs/21-insecure-deserialization && docker compose up
```

## 🧪 Tests
```bash
cd exploit && npm install && npm test
```
Each vulnerable stage must execute code during deserialization; `/fixed` must render every
payload inert while still loading normal preferences.
