# Lab 22 — Race Conditions

| | |
|---|---|
| **Tier** | 5 — Advanced |
| **OWASP** | A04:2021 – Insecure Design |
| **Difficulty** | hard |
| **Stages** | 5 vulnerable + 1 fixed |

## 🎯 The scenario
A one-time $500 signup bonus can be claimed **more than once** by racing concurrent
requests. Every vulnerable stage leaves an `await` between the "have you claimed?" check
and the commit — the window a race exploits.

> A stage is solved when concurrent `POST /claim` requests push the grant count past 1.
> `GET /status` reports the count; `POST /reset` resets it. (This lab is driven by
> concurrency — fire many claims at once.)

## 🧠 The one idea
Check-then-act is safe only when the check and the state change are **atomic**. In async
code, any `await` between them opens a TOCTOU window; take the guard synchronously before
yielding, or use a DB transaction / unique constraint / conditional `UPDATE`.

---

## Stage 1 — No guard · `/stage/1`
Every claim grants. **Race:** just send many.

## Stage 2 — Flag set after the await · `/stage/2`
`if (!claimed) { await …; grant(); claimed = true; }` — flag set too late.

## Stage 3 — Non-atomic read-modify-write · `/stage/3`
`if (uses > 0) { await …; uses--; grant(); }` — all read `uses === 1`.

## Stage 4 — Lock acquired too late · `/stage/4`
`if (busy) return; await …; busy = true; …; busy = false;` — check-then-set straddles the await.

## Stage 5 — Non-atomic idempotency check · `/stage/5`
`if (seen.has(key)) return; await …; seen.add(key);` — same key concurrently all pass.

## Stage 6 — Atomic check-and-set · `/fixed`
```js
if (claimed) return;
claimed = true;         // 🟢 set synchronously, before any await
await delay(); grant();
```
The second concurrent request already sees `claimed === true`. Granted exactly once.

### ✅ Takeaways
- Set the guard atomically **before** the first `await`.
- In a real datastore: transactions, `SELECT … FOR UPDATE`, unique constraints, or
  conditional `UPDATE … WHERE`.
- Don't rely on "it's fast enough" — attackers send requests in parallel.

## ▶️ Run it
```bash
npm run dev                              # → http://localhost:4022
# or: cd labs/22-race-conditions && docker compose up
```

## 🧪 Tests
```bash
cd exploit && npm install && npm test
```
Each vulnerable stage must grant the bonus >1× under concurrent claims; `/fixed` must
grant it exactly once.
