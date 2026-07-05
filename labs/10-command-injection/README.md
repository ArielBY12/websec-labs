# Lab 10 — OS Command Injection

| | |
|---|---|
| **Tier** | 3 — Injection+ |
| **OWASP** | A03:2021 – Injection |
| **Difficulty** | medium |
| **Stages** | 5 vulnerable + 1 fixed |

## 🎯 The scenario
A "host lookup" tool runs a shell command with the hostname you supply. Make it run a
command of *your* choosing — proven by output like `uid=…` from `id`, which a hostname
lookup would never print.

> A stage is solved when injected output (`uid=…`) appears. The fixed stage must treat
> every payload as a literal hostname while a real lookup still works.

## 🧠 The one idea
The bug is handing user input to a **shell**. A shell interprets `;`, `&&`, `|`, `$()`,
quotes and more as syntax. No blacklist covers them all — the fix is to **not invoke a
shell**: pass the input as a direct argument to the program.

---

## Stage 1 — Raw shell concatenation · `/stage/1`
```js
exec(`echo Looking up ${host}`)   // 🔴 straight into /bin/sh
```
**Exploit:** `127.0.0.1; id`. **Root cause:** metacharacters in a shell string run commands.

## Stage 2 — Semicolon blacklist · `/stage/2`
```js
if (host.includes(';')) reject   // 🔴 one operator
```
**Exploit:** `127.0.0.1 && id`. **Root cause:** `;` is one of many chaining operators.

## Stage 3 — Operator blacklist · `/stage/3`
```js
if (/[;|&\n]/.test(host)) reject   // 🔴 no substitution guard
```
**Exploit:** `127.0.0.1$(id)`. **Root cause:** `$()`/backticks execute with no separator.

## Stage 4 — Quoted argument · `/stage/4`
```js
exec(`echo "Looking up ${host}"`)   // 🔴 quotes aren't escaping
```
**Exploit:** `127.0.0.1"; id; echo "` — close the quote, then chain. **Root cause:** a value can end the quote that "contains" it.

## Stage 5 — Unanchored allowlist · `/stage/5`
```js
if (!/[a-zA-Z0-9.-]/.test(host)) reject   // 🔴 no ^…$ anchors
```
**Exploit:** `127.0.0.1; id` — the string *contains* valid chars, so `.test()` passes. **Root cause:** an unanchored allowlist validates nothing.

## Stage 6 — No shell — argument vector · `/fixed`
```js
execFile('echo', ['Looking up', host])   // 🟢 host is one argv element; no shell
```
Every earlier payload becomes a harmless literal string because no shell parses it. A
real lookup still works.

### ❌ Common wrong "fixes"
- **Blacklisting characters/operators** — endless bypasses (Stages 2–4).
- **Quoting the argument** in the shell string — closable (Stage 4).
- **Unanchored allowlist regex** — matches a substring (Stage 5).
- **Escaping metacharacters by hand** — error-prone; use the argument vector instead.

### ✅ Takeaways
- Never build a shell command from user input; use `execFile`/`spawn` with an argv array (`shell: false`).
- If you must validate, anchor the allowlist (`^[a-zA-Z0-9.-]+$`) and reject the whole input.

## ▶️ Run it
```bash
npm run dev                              # → http://localhost:4010
# or: cd labs/10-command-injection && docker compose up
```

## 🧪 Tests
```bash
cd exploit && npm install && npm test
```
Each vulnerable stage must run `id`; `/fixed` must treat all payloads as literal
hostnames while still serving a real lookup.
