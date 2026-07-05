# Lab 23 — Regular Expression DoS (ReDoS)

| | |
|---|---|
| **Tier** | 5 — Advanced |
| **OWASP** | A06:2021 – Vulnerable and Outdated Components |
| **Difficulty** | hard |
| **Stages** | 5 vulnerable + 1 fixed |

## 🎯 The scenario
An input validator uses a regex with **catastrophic backtracking**. Send a *short* input
that makes validation run for a long time — a denial of service from a few dozen
characters.

> The server times each validation; anything over the threshold (50 ms) is flagged as
> pathological. A stage is solved when your input trips that.

## 🧠 The one idea
A quantifier nested in another quantifier — or an alternation whose branches overlap —
creates exponentially many ways to match. On an input that ultimately *fails*, the engine
tries them all. Use linear patterns (and bound input, or use a linear engine like RE2).

---

## Stage 1 — Nested quantifier `(a+)+` · `/stage/1`
**Payload:** `aaaaaaaaaaaaaaaaaaaaaaaaaaa!`.

## Stage 2 — Email regex `([a-z0-9]+)*@…` · `/stage/2`
Nested quantifier in the local part. **Payload:** long local part + `@x` (wrong domain forces backtracking).

## Stage 3 — Overlapping alternation `(a|a)*` · `/stage/3`
Both branches match `a`. **Payload:** `aaaaaaaaaaaaaaaaaaaaaaaa!`.

## Stage 4 — Length cap that's too high · `/stage/4`
`(x+)+` with a 40-char cap. **Payload:** ~28 `x`s + `!` — under the cap, still catastrophic.

## Stage 5 — Nested quantifier over `\w`/`\s` · `/stage/5`
`(\w+\s*)*`. **Payload:** `aaaaaaaaaaaaaaaaaaaaaaaaaa!`.

## Stage 6 — Linear regex + input bound · `/fixed`
```js
const RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]+$/i;   // 🟢 no nested quantifier / ambiguity
if (input.length > 254) reject;
```
Matching is linear; the same payloads finish in microseconds.

### ✅ Takeaways
- Avoid nested quantifiers `(x+)+` and overlapping alternations `(a|a)*`.
- A length cap only helps against linear/polynomial cost, not exponential.
- Prefer a linear regex engine (RE2) or non-regex validation for untrusted input.

## ▶️ Run it
```bash
npm run dev                              # → http://localhost:4023
# or: cd labs/23-redos && docker compose up
```

## 🧪 Tests
```bash
cd exploit && npm install && npm test
```
Each vulnerable stage must exceed the time threshold on a short input; `/fixed` must stay
fast on all of them.
