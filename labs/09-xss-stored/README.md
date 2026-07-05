# Lab 09 — Stored XSS

| | |
|---|---|
| **Tier** | 3 — Injection+ |
| **OWASP** | A03:2021 – Injection |
| **Difficulty** | medium |
| **Stages** | 5 vulnerable + 1 fixed |

## 🎯 The scenario
A product-review board **stores** each review and shows it to every visitor. Get a
script of your choosing to run in a viewer's browser — persistent, stored XSS that
fires for everyone, not just you.

> A stage is solved when your stored review renders as a **live** executable construct
> (a real tag, an event handler outside a quoted value, or a `javascript:` link). The
> fixed stage must render every payload inert while a normal review still shows.

## 🧠 The one idea
The bug isn't the input — it's the **output**. Whenever stored data is written into a
page, it must be **encoded for the exact context** it lands in (element text, attribute
value, URL). Filtering input by blacklist always loses; encoding at the sink wins.

---

## Stage 1 — Raw stored output · `/stage/1`
Reviews are echoed verbatim.

```js
comments.map((c) => `<p>${c.text}</p>`)   // 🔴 no encoding
```
**Exploit:** `<script>alert(1)</script>`. **Root cause:** stored input rendered without encoding.

## Stage 2 — Script-tag blacklist · `/stage/2`
`<script>` tags are stripped.

```js
text.replace(/<script\b[^>]*>|<\/script>/gi, '')   // 🔴 only <script>
```
**Exploit:** `<img src=x onerror=alert(1)>`. **Root cause:** a blacklist misses event handlers and countless other vectors.

## Stage 3 — Attribute-context breakout · `/stage/3`
The body is encoded, but the author name goes into `title="…"` with only `<`/`>` encoded.

```js
`<p title="${author.replace(/</g,'&lt;').replace(/>/g,'&gt;')}">`   // 🔴 quote not encoded
```
**Exploit:** author = `x" onmouseover="alert(1)`. **Root cause:** encoding must match the context — the attribute delimiter (`"`) must be encoded.

## Stage 4 — javascript: URI in a link · `/stage/4`
The comment is encoded; a reviewer's "website" becomes a link with an unvalidated scheme.

```js
`<a href="${escapeHtml(website)}">website</a>`   // 🔴 scheme not checked
```
**Exploit:** website = `javascript:alert(1)`. **Root cause:** URL sinks need scheme allowlisting; HTML-encoding won't stop `javascript:`.

## Stage 5 — Non-recursive tag stripping · `/stage/5`
`<script>` is removed, but in a single pass that isn't re-scanned.

```js
text.replace(/<script>/gi, '').replace(/<\/script>/gi, '')   // 🔴 one pass
```
**Exploit:** `<scr<script>ipt>alert(1)</scr<script>ipt>` — deleting the inner tag re-forms the outer one. **Root cause:** strip filters must loop to a fixed point (or just encode).

## Stage 6 — Contextual output encoding + CSP · `/fixed`
Encode each value for its context (quotes included), allowlist `http(s)` link schemes, and set a CSP.

```js
`<p title="${escapeHtml(c.author)}">${escapeHtml(c.text)}${safeHref(c.website)}</p>`   // 🟢
res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'none'");
```
Tags, event handlers, attribute breakouts and `javascript:` URIs are all inert; a
normal review (and a real `https://` link) still works.

### ❌ Common wrong "fixes"
- **Blacklisting tags/attributes** — endless bypasses (Stages 2, 5).
- **Encoding `<`/`>` only** — wrong for attribute and URL contexts (Stages 3, 4).
- **Single-pass sanitizers** — re-create the pattern they removed (Stage 5).
- **Relying on a CSP alone** — good defense-in-depth, but encode too.

### ✅ Takeaways
- Encode output for its exact context; escape quotes in attributes.
- Allowlist URL schemes (`http`/`https`).
- Prefer a vetted sanitizer/DOM approach over regex; add a CSP.

## ▶️ Run it
```bash
npm run dev                              # → http://localhost:4009
# or: cd labs/09-xss-stored && docker compose up
```

## 🧪 Tests
```bash
cd exploit && npm install && npm test
```
Each vulnerable stage must render its payload live; `/fixed` must neutralize all five
while still displaying a normal review.
