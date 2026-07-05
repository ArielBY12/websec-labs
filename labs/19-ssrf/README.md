# Lab 19 — Server-Side Request Forgery

| | |
|---|---|
| **Tier** | 5 — Advanced |
| **OWASP** | A10:2021 – Server-Side Request Forgery |
| **Difficulty** | hard |
| **Stages** | 5 vulnerable + 1 fixed |

## 🎯 The scenario
A "URL preview" feature fetches a URL you supply — from the **server's** network. Make it
reach the internal metadata service (`169.254.169.254`) that only the server can see, and
return the secret it serves.

> The network is modeled in-process: internal hosts return the secret, `redirect.evil` is
> a public host that 302-redirects inward. A stage is solved when the response contains
> the internal secret.

## 🧠 The one idea
The only safe check is on the **host actually connected to**, resolved to an IP and
compared against internal ranges (or an allowlist) — after redirects, with a real URL
parser. String checks and range blocklists always leak.

---

## Stage 1 — No validation · `/stage/1`
**Exploit:** `http://169.254.169.254/`.

## Stage 2 — Hostname string blacklist · `/stage/2`
Blocks `localhost`/`127.0.0.1`. **Exploit:** `http://2130706433/` (decimal) or `http://127.1/`.

## Stage 3 — Validates host, follows redirects · `/stage/3`
Blocks internal initial hosts. **Exploit:** `http://redirect.evil/` → redirects inward.

## Stage 4 — URL parser confusion · `/stage/4`
Regex grabs the host including `user@`. **Exploit:** `http://foo@169.254.169.254/`.

## Stage 5 — Incomplete blocklist · `/stage/5`
Blocks `127./10./192.168./172.16.`. **Exploit:** `http://169.254.169.254/` (link-local, not listed).

## Stage 6 — Robust host validation · `/fixed`
```js
const u = new URL(url);
if (!/^https?:$/.test(u.protocol) || isInternalHost(u.hostname)) block;   // 🟢
fakeFetch(url, /* follow */ false);
```
Decimal/short IPs, userinfo, link-local, and redirects are all blocked; public URLs work.

### ✅ Takeaways
- Validate the **resolved IP** of the host actually connected to; canonicalize first.
- Allowlist destinations where possible; block all internal/loopback/link-local ranges.
- Use a real URL parser; restrict schemes; re-check after redirects or disable them.

## ▶️ Run it
```bash
npm run dev                              # → http://localhost:4019
# or: cd labs/19-ssrf && docker compose up
```

## 🧪 Tests
```bash
cd exploit && npm install && npm test
```
Each vulnerable stage must reach the internal service; `/fixed` must block every trick
while still fetching a public URL.
