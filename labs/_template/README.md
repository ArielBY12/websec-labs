# Lab NN — <Vulnerability Name>

| | |
|---|---|
| **Level** | 1 |
| **OWASP** | A00:2021 – Category |
| **Difficulty** | easy |

## 🎯 The scenario
What feature does this app expose, and what is the attacker's goal?

## 🔴 The vulnerability
What is the insecure pattern in `vulnerable/`? Point to the exact lines.

```js
// the wrong pattern
```

## 💥 Exploitation (PoC)
Step-by-step. Curl commands / payloads that demonstrate the attack.

```bash
curl '...'
```

## 🧠 Root cause
*Why* does this happen? What wrong assumption did the developer make?

## 🟢 The fix
What changed in `fixed/`, and why it actually closes the hole (not just hides it).

```js
// the secure pattern
```

### ❌ Common wrong "fixes" (and why they fail)
- ...

## ✅ Takeaways
- ...

## ▶️ Run it
```bash
docker compose up
# vulnerable → http://localhost:<port>
# fixed      → http://localhost:<port+1>
```
