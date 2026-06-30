# Lab 04 — Open Redirect

| | |
|---|---|
| **Tier** | 1 — Basics |
| **Class** | CWE-601 — URL Redirection to Untrusted Site |
| **Difficulty** | easy |
| **Stages** | 4 vulnerable + 1 fixed |

## 🎯 The scenario
Lots of sites have a "return to" redirect: after login (or a click-tracker, or a
logout), `/go?url=/account` sends you back to where you were — a path **on this
site** (`websec-labs.local`). If the destination isn't validated, an attacker
crafts `https://websec-labs.local/go?url=https://evil.example/login`: the link
*looks* like the trusted site, but it forwards the victim to a phishing page. That's
an **open redirect**.

> The `/go` endpoint renders its resolved destination in a `data-target="…"`
> attribute (and a meta-refresh). A stage is exploited when that destination leaves
> the site (host `evil.example`); the fixed stage must force every payload back to
> `/` while still honouring a real same-site path — that's what the tests assert.

## 🧠 The one idea
A redirect destination is **input**, and input you turn into a navigation must be
**validated against where you're actually allowed to send users** — ideally a
same-site relative path you build, or an allowlist of exact hosts. Trying to
*blacklist* "bad" URLs always loses, because URL syntax has more ways to name a host
than your check anticipates.

---

## Stage 1 — Redirect to any URL · `/stage/1`
The destination is used as-is.

```js
const target = req.query.url || '/';   // 🔴 no validation
```

**Exploit:** `/stage/1/go?url=https://evil.example/login`
**Root cause:** an attacker-controlled URL is used as a redirect target with no check.

## Stage 2 — Block http(s):// schemes · `/stage/2`
First fix: bounce anything that starts with a scheme, to "force" relative URLs.

```js
if (/^https?:\/\//i.test(target)) target = '/';   // blocks http(s):// … only
```

**Exploit:** `/stage/2/go?url=//evil.example/login`
**Why it fails:** a **protocol-relative** URL (`//host`) has no scheme, so it dodges
the check — but the browser still reads `//evil.example` as "go to that host". You
never wrote "http".

## Stage 3 — Must start with our site URL · `/stage/3`
Stronger: require the URL to begin with our base URL.

```js
if (!target.startsWith('https://websec-labs.local')) target = '/';   // string prefix check
```

**Exploit:** `/stage/3/go?url=https://websec-labs.local.evil.example/login`
**Why it fails:** `startsWith` is a *text* check, not a *URL* check. The host of that
URL is `websec-labs.local.evil.example` — a domain the **attacker** registers — yet
the string still begins with the trusted prefix. (The mirror trick beats substring
checks too: `https://evil.example/?x=websec-labs.local`.) To compare hosts, parse the
URL and check the host **exactly**.

## Stage 4 — Require a leading-slash path · `/stage/4`
Almost there: stop blacklisting and instead require the destination to *look* like a
path on this site — it must start with `/` and must not be `//`.

```js
if (!target.startsWith('/') || target.startsWith('//')) target = '/';   // leading "/", but not "//"
```

**Exploit:** `/stage/4/go?url=/\evil.example/login`  *(a backslash after the slash)*
**Why it fails:** browsers normalize backslashes to slashes in the authority
position, so `/\evil.example` is parsed as `//evil.example` — protocol-relative, and
off-site. Your input started with a single `/` (passes) and wasn't literally `//`
(passes), yet it still left the site. Every earlier payload is blocked here — only
the backslash slips through.

## Stage 5 — Same-site relative paths only · `/fixed`
Stop validating arbitrary external URLs; only allow a relative path we control.

```js
const target = /^\/[^/\\]/.test(raw) ? raw : '/';   // 🟢 one leading "/", not "//" or "/\"
```

`/account` passes; `https://evil…`, `//evil…`, and the look-alike host all fail the
test and fall back to `/`. The destination can only ever be a page on this site.

### ❌ Common wrong "fixes" (and why they fail)
- **Block the scheme** — protocol-relative `//host` and `https:\` tricks remain.
- **`startsWith` / `includes` the trusted host** — `trusted.com.evil.com`,
  `evil.com/?x=trusted.com`, `trusted.com@evil.com` all pass.
- **Decode-then-check once** — double-encoding (`%2f%2f`, `%252f`) slips through a
  single decode.

### ✅ Takeaways
- Prefer **same-site relative paths you build yourself**, or map an opaque key
  (`?next=cart`) to a known destination.
- If you must accept a URL, **parse it** (`new URL`) and check `host` against an
  **exact allowlist** — never prefix/substring matching.
- Reject `//` and `/\` — browsers treat them as protocol-relative.

## ▶️ Run it
```bash
# from the repo root — runs the hub + every lab, including this one
npm run dev                              # → http://localhost:4004

# or just this lab in Docker
cd labs/04-open-redirect && docker compose up
```
Open `/` for the stage menu, read each stage's source, and try to get redirected to
`evil.example` — then watch `/fixed` send every off-site payload back to `/`.

## 🧪 Tests
```bash
cd exploit && npm install && npm test
```
Each vulnerable stage must redirect off-site; `/fixed` must keep every payload
on-site while still honouring a genuine same-site path.
