# Lab 12 — Path Traversal

| | |
|---|---|
| **Tier** | 3 — Injection+ |
| **OWASP** | A01:2021 – Broken Access Control |
| **Difficulty** | medium |
| **Stages** | 5 vulnerable + 1 fixed |

## 🎯 The scenario
A document viewer reads files from a server directory by name. Make it read a file that
lives **outside** that directory — a server secret (`secret.txt` / `docs_secret.txt`) or
a system file like `/etc/passwd`.

> A stage is solved when the response contains data from outside the docs root (a
> `PATHTRAVERSAL{…}` marker or an `/etc/passwd` line). The fixed stage must reject every
> traversal while still opening real documents.

## 🧠 The one idea
The bug is trusting a filename. The only safe check is on the **final, resolved path**:
resolve it, then confirm it stays inside the intended base directory. Every string-level
filter (stripping `../`, blocking `..`, prefix checks) can be tricked.

---

## Stage 1 — Raw path join · `/stage/1`
```js
fs.readFileSync(path.join(DOCS, name))   // 🔴 ../ climbs out
```
**Exploit:** `../secret.txt`.

## Stage 2 — Non-recursive "../" strip · `/stage/2`
```js
name.replace(/\.\.\//g, '')   // 🔴 one pass
```
**Exploit:** `....//secret.txt` — removing the inner `../` re-forms it.

## Stage 3 — Check before decode · `/stage/3`
```js
if (name.includes('..')) reject;
const decoded = decodeURIComponent(name);   // 🔴 decode after the check
```
**Exploit:** `%2e%2e/secret.txt` — no literal `..` until after decoding.

## Stage 4 — Blocks ".." but not absolute paths · `/stage/4`
```js
if (decoded.includes('..')) reject;
path.resolve(DOCS, decoded)   // 🔴 absolute arg wins
```
**Exploit:** `/etc/passwd` — an absolute path needs no `..`.

## Stage 5 — startsWith without a separator · `/stage/5`
```js
if (!resolved.startsWith(DOCS)) reject;   // 🔴 no trailing sep
```
**Exploit:** `../docs_secret.txt` — `/…/docs_secret.txt` starts with `/…/docs`.

## Stage 6 — Resolve then bounds-check · `/fixed`
```js
const full = path.resolve(DOCS, decodeURIComponent(name));
if (full !== DOCS && !full.startsWith(DOCS + path.sep)) reject;   // 🟢
```
Traversal, encoded dots, absolute paths, and sibling-prefix names are all rejected; real
documents still open.

### ❌ Common wrong "fixes"
- **Stripping/blocking `..`** — bypassed by nesting, encoding, or absolute paths (Stages 2–4).
- **`startsWith(base)` without a separator** — matches siblings (Stage 5).
- **Validating the raw string** instead of the resolved path.

### ✅ Takeaways
- Resolve to an absolute path, then require it to be inside `base + path.sep`.
- Decode/canonicalize *before* validating; reject absolute inputs.
- Prefer serving from an allowlist of known files where possible.

## ▶️ Run it
```bash
npm run dev                              # → http://localhost:4012
# or: cd labs/12-path-traversal && docker compose up
```

## 🧪 Tests
```bash
cd exploit && npm install && npm test
```
Each vulnerable stage must read outside the docs root; `/fixed` must reject all
traversals while still opening `welcome.txt`.
