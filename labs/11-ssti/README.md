# Lab 11 — Server-Side Template Injection

| | |
|---|---|
| **Tier** | 3 — Injection+ |
| **OWASP** | A03:2021 – Injection |
| **Difficulty** | medium |
| **Stages** | 5 vulnerable + 1 fixed |

## 🎯 The scenario
A greeting-preview feature **compiles the template you supply** on the server. Make it
run code and read the server secret held in `__SSTI_FLAG__` (value `SSTI{…}`) — reading
it proves your template executed, i.e. RCE.

> A stage is solved when the render leaks the secret. The fixed stage must render every
> payload literally while a normal greeting still works.

## 🧠 The one idea
Compiling untrusted input as a template **is `eval`**. Template expressions run as
server-side code with full runtime access. Blacklisting delimiters or identifiers never
holds — the fix is to keep templates static and pass user input as **bound data**.

> ⚠️ This lab's engine intentionally evaluates expressions with the `Function`
> constructor so injection is real. It's for local learning only.

---

## Stage 1 — Template compiled from user input · `/stage/1`
```js
tpl.replace(/{{(.+?)}}/g, (_, e) => evalExpr(e))   // 🔴 compiles user input
```
**Exploit:** `{{ 7*7 }}` proves it; `{{ global.__SSTI_FLAG__ }}` reads the secret.

## Stage 2 — Delimiter blacklist · `/stage/2`
```js
if (/{{|}}/.test(tpl)) reject;   // 🔴 engine still evaluates {% %}
```
**Exploit:** `{% global.__SSTI_FLAG__ %}`. **Root cause:** the feature, not the braces, is the bug.

## Stage 3 — Keyword blacklist: global · `/stage/3`
```js
if (/global/i.test(tpl)) reject;   // 🔴 misses `this`
```
**Exploit:** `{{ this.__SSTI_FLAG__ }}` — a non-strict function's `this` is the global object.

## Stage 4 — Bigger keyword blacklist · `/stage/4`
```js
if (/global|globalThis|this|process/i.test(tpl)) reject;   // 🔴 constructor chain
```
**Exploit:** `{{ ''.constructor.constructor('return __SSTI_FLAG__')() }}` — `''.constructor.constructor` is `Function`, which runs in global scope where the secret is a bare identifier.

## Stage 5 — Blacklist: constructor · `/stage/5`
```js
if (/…|constructor/i.test(tpl)) reject;   // 🔴 string construction
```
**Exploit:** `{{ ''['con'+'structor']['con'+'structor']('return __SSTI_FLAG__')() }}` — the banned word never appears literally.

## Stage 6 — Input as data, not template · `/fixed`
```js
const TEMPLATE = 'Hello {{ user }}';   // fixed server-side
TEMPLATE.replace(/{{(.+?)}}/g, (_, key) => escapeHtml(String(data[key.trim()])));   // 🟢 bound, encoded
```
The request only supplies the *value* of `user`; the template is a constant. Every
earlier payload is displayed literally. Separate code from data.

### ❌ Common wrong "fixes"
- **Blacklisting delimiters** (Stage 2) or **identifiers** (Stages 3–5) — endless bypasses.
- **A homemade "sandbox"** around eval — the constructor chain escapes it.

### ✅ Takeaways
- Never compile untrusted input as a template.
- Keep templates static; pass user input as bound, output-encoded data.
- If you need user-authored templates, use a real logic-less/sandboxed engine and treat it as untrusted.

## ▶️ Run it
```bash
npm run dev                              # → http://localhost:4011
# or: cd labs/11-ssti && docker compose up
```

## 🧪 Tests
```bash
cd exploit && npm install && npm test
```
Each vulnerable stage must leak the secret; `/fixed` must render every payload literally
while still greeting normally.
