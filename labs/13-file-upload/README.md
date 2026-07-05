# Lab 13 — Unrestricted File Upload

| | |
|---|---|
| **Tier** | 3 — Injection+ |
| **OWASP** | A03:2021 – Injection |
| **Difficulty** | medium |
| **Stages** | 5 vulnerable + 1 fixed |

## 🎯 The scenario
An avatar upload stores files and serves them back from `/files/<name>`. Get a file
served with an **executable Content-Type** (`text/html` or SVG) so a browser runs your
script — stored XSS via upload.

> Uploads are modeled as `{filename, content, mimetype}` form fields (no multipart
> dependency), which keeps the focus on the validation and the served Content-Type — the
> parts that actually decide the vulnerability. A stage is solved when the served
> response is script-executable.

## 🧠 The one idea
Nothing the client controls — the filename, the extension, the declared MIME — should
decide how a file is **stored or served**. The server must choose the name and the
Content-Type, and tell the browser not to sniff.

---

## Stage 1 — No validation · `/stage/1`
```js
const type = typeByExt(filename)   // 🔴 .html → text/html
```
**Exploit:** upload `evil.html` = `<script>…</script>`.

## Stage 2 — Case-sensitive extension blacklist · `/stage/2`
```js
if (/\.(html?|php|svg|js)$/.test(filename)) reject   // 🔴 no /i
```
**Exploit:** `evil.HTML` — uppercase slips the blacklist; served `text/html`.

## Stage 3 — Trusts the client Content-Type · `/stage/3`
```js
if (!/^image\//.test(mimetype)) reject   // 🔴 client-controlled
const type = typeByExt(filename)         // served by extension
```
**Exploit:** `evil.html` with claimed type `image/png`.

## Stage 4 — Allowlisted extension, client type on serve · `/stage/4`
```js
if (!/\.(png|jpe?g|gif)$/i.test(filename)) reject;
const type = mimetype;   // 🔴 served with the client's type
```
**Exploit:** `avatar.png` (script content) with claimed type `text/html`.

## Stage 5 — Double extension · `/stage/5`
```js
// last ext must be an image; type mapped from the FIRST ext
const type = typeByExt('x.' + filename.split('.')[1]);   // 🔴
```
**Exploit:** `avatar.html.png` — passes the `.png` check, served as `text/html`.

## Stage 6 — Server-decided name, type, and nosniff · `/fixed`
```js
if (!['png','jpg','jpeg','gif'].includes(ext)) reject;
const stored = crypto.randomBytes(8).toString('hex') + '.' + ext;
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('Content-Type', typeByExt('x.' + ext));   // 🟢 server-chosen image type
```
The client's name and type are ignored; the file can only ever be served as an inert
image. A real image still uploads.

### ❌ Common wrong "fixes"
- **Blacklisting extensions** — case and new extensions bypass it (Stage 2).
- **Checking the client MIME** — it's attacker-supplied (Stage 3).
- **Echoing the client Content-Type on download** (Stage 4).
- **Validating one extension while serving by another** (Stage 5).

### ✅ Takeaways
- Generate the stored name server-side; allowlist a single final extension.
- Serve with a server-decided Content-Type and `X-Content-Type-Options: nosniff`.
- Ideally serve user content from a separate, cookie-less origin.

## ▶️ Run it
```bash
npm run dev                              # → http://localhost:4013
# or: cd labs/13-file-upload && docker compose up
```

## 🧪 Tests
```bash
cd exploit && npm install && npm test
```
Each vulnerable stage must serve an upload as executable content; `/fixed` must serve
every upload inert while still accepting a real image.
