# Lab 02 — Reflected XSS

| | |
|---|---|
| **Tier** | 1 — Basics |
| **OWASP** | A03:2021 – Injection |
| **Difficulty** | easy |
| **Stages** | 3 vulnerable + 1 fixed |

## 🎯 The scenario
A store's search page echoes your query back: *"You searched for: …"*. The term is
taken from the `?q=` URL parameter and written into the HTML response. If that term
is reflected without encoding, an attacker can put **HTML/JavaScript** in a link
(`/stage/1/?q=<script>…`) and have it run in the victim's browser — classic
**reflected XSS**.

> A reflected XSS fires the moment attacker-controlled text reaches the page with
> its structural characters (here, `<`) **unencoded**, so the browser parses it as
> markup instead of showing it as text. The exploit tests check exactly that: does
> the response contain a live `<tag…` rather than the escaped `&lt;tag…`?

## 🧠 The one idea
Output is supposed to be **text**. The moment you drop user input into HTML without
encoding it for that context, the input stops being data and becomes **markup the
browser executes**. Every stage below is a different *input filter* trying to undo
that mistake — and each one is bypassable, because the real fix is to **encode on
output**, not to blacklist on input.

---

## Stage 1 — Naive reflection · `/stage/1`
The term is concatenated straight into the page.

```js
const reflected = q;                       // 🔴 raw input echoed into HTML
result = `<p>You searched for: ${reflected}</p>`;
```

**Exploit:** `/stage/1/?q=<script>alert(1)</script>`
**Root cause:** input written into an HTML context with no output encoding is parsed
as HTML.

## Stage 2 — Blacklist the script tag · `/stage/2`
First fix attempt: delete `<script>` tags before reflecting.

```js
const reflected = q.replace(/<\/?script\b[^>]*>/gi, '');   // removes <script> … and nothing else
```

**Exploit:** `/stage/2/?q=<img src=x onerror=alert(1)>`
**Why it fails:** scripts aren't the only way to run JS. An `<img>` whose `src`
fails triggers its `onerror` handler — no `<script>` tag in sight, so the blacklist
never touches it.

## Stage 3 — HTML-encoded, but inside an attribute · `/stage/3`
The dev stops blacklisting and actually **encodes** the term — `<`, `>`, `&` become
entities, so **no tag injection works any more** (every Stage 1 & 2 payload is dead
here). But the term is reflected inside a **double-quoted attribute**, and the
encoder never touches the quote `"` that delimits it.

```js
const enc = q.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); // encodes <>& … but not "
result = `<label>You searched for</label><input class="echo" value="${enc}">`;  // reflected into a quoted attribute
```

**Exploit:** `/stage/3/?q=" autofocus onfocus=alert(1) x="`
This renders `…value="" autofocus onfocus=alert(1) x="">`: your `"` closed the
`value` attribute early, and `autofocus onfocus=alert(1)` became **live attributes**
on the input — `autofocus` focuses it on load, firing `onfocus`. No `<` required.

**Why it fails:** the encoding was right for HTML **text**, but the term landed in an
**attribute** context. Encoding has to match the context you're writing into — in a
quoted attribute that means encoding the **quote delimiter** too. (Stage 1 & 2's
tag-injection payloads, by contrast, *are* blocked here — the escalation holds.)

## Stage 4 — Output encoding · `/fixed`
Stop blacklisting input; **encode on output** for the HTML-text context.

```js
const reflected = shared.escapeHtml(q);    // 🟢 < > & " → entities; input can only be text
result = `<p>You searched for: ${reflected}</p>`;
```

Now `<script>alert(1)</script>` renders as the **visible text** `<script>alert(1)</script>`
— `<` became `&lt;`, so the browser never starts a tag. And because `escapeHtml` also
encodes `"` → `&quot;`, the Stage 3 quote-breakout can't close an attribute either.
Every Stage 1–3 payload is inert here, while a normal search (`?q=running shoes`)
still shows correctly.

### ❌ Common wrong "fixes" (and why they fail)
- **Blacklisting tags / handlers** (Stages 2–3) — there's always another tag,
  attribute, protocol (`javascript:`), or syntax quirk the filter didn't list.
- **Sanitizing on input** — you don't know the output context at input time; the
  same string may be safe in HTML text but dangerous in an attribute, URL, or JS.
- **`escape()` / `encodeURIComponent`** — those are for URLs/JS, not HTML text; they
  don't neutralize `<`.

### ✅ Takeaways
- **Encode on output, for the exact context** you're writing into (HTML text, HTML
  attribute, URL, JS string each differ).
- Prefer frameworks / templating that auto-escape by default.
- **Defense in depth:** a strict `Content-Security-Policy` limits damage when an
  encoding is missed.

## ▶️ Run it
```bash
# from the repo root — runs the hub + every lab, including this one
npm run dev                              # → http://localhost:4002

# or just this lab in Docker
cd labs/02-xss-reflected && docker compose up
```
Open `/` for the stage menu, read each stage's source, and try to get the alert to
fire (in a real browser) — or watch the reflection switch from live `<tag>` to
escaped `&lt;tag&gt;` at `/fixed`.

## 🧪 Tests
```bash
cd exploit && npm install && npm test
```
Each vulnerable stage's PoC must reflect live markup; `/fixed` must neutralize them
all while still reflecting valid text.
