# Lab NN — <Vulnerability Name>

| | |
|---|---|
| **Tier** | 1 |
| **OWASP** | A00:2021 – Category |
| **Difficulty** | easy |
| **Stages** | 3 vulnerable + 1 fixed (standard depth) |

## 🎯 The scenario
What feature does this app expose, and what is the attacker's goal?

## 🧠 The one idea
The single root concept this whole lab teaches (e.g. "input becomes code").

---

## Stage 1 — <naive> · `/stage/1`
The unguarded vulnerable pattern.

```js
// 🔴 the wrong pattern
```
**Exploit:** payload + what it does.
**Root cause:** the wrong assumption.

## Stage 2 — <weak defense> · `/stage/2`
A first attempt to fix it that looks plausible but is bypassable.

**Exploit:** the bypass. **Why it fails:** ...

## Stage 3 — <better-looking defense> · `/stage/3`
A stronger attempt, still bypassable.

**Exploit:** the bypass. **Why it fails:** ...

## Stage 4 — <the fix> · `/fixed`
The correct mitigation, and *why* it actually closes the hole (not just hides it).

```js
// 🟢 the secure pattern
```

### ❌ Common wrong "fixes" (and why they fail)
- ...

### ✅ Takeaways
- ...

## ▶️ Run it
```bash
cd app && npm install && npm start      # → http://localhost:<port>
# or: docker compose up
```

## 🧪 Tests
```bash
cd exploit && npm install && npm test
```
