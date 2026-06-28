# 🛡️ WebSec Labs

A hands-on, level-based collection of intentionally vulnerable web labs covering the
**OWASP Top 10** and beyond. Every lab ships in three layers:

| Layer | Folder | What it is |
|-------|--------|------------|
| 🔴 **Vulnerable** | `vulnerable/` | The feature implemented with the *wrong* pattern |
| 🟢 **Fixed** | `fixed/` | The same feature, done securely, with notes on what changed |
| 💥 **Exploit** | `exploit/` | A working PoC + an automated test that proves the bug |

Each lab has a **writeup** explaining the vulnerability, how to exploit it, the
**root cause**, and how to fix it properly.

> ⚠️ **Warning — intentionally vulnerable code.** These apps contain real
> vulnerabilities for educational purposes. Run them **only** locally / inside Docker.
> Never deploy them to a public server.

---

## 🚀 Quick start

```bash
# Run the hub dashboard (lists every lab + status)
cd hub && npm install && npm start
# → http://localhost:3000

# Run a single lab (vulnerable + fixed side by side)
cd labs/01-sqli && docker compose up
```

---

## 🗺️ Vulnerability map

### Level 1 — Basics
- [ ] `01-sqli` — SQL Injection · `A03:2021 Injection`
- [ ] `02-xss-reflected` — Reflected XSS · `A03:2021 Injection`
- [ ] `03-idor` — Insecure Direct Object Reference · `A01:2021 Broken Access Control`
- [ ] `04-open-redirect` — Open Redirect

### Level 2 — Auth & Access
- [ ] `05-broken-access-control` · `A01:2021`
- [ ] `06-jwt-attacks` — alg=none / weak secret
- [ ] `07-csrf` — Cross-Site Request Forgery
- [ ] `08-auth-failures` · `A07:2021`

### Level 3 — Injection+
- [ ] `09-xss-stored` — Stored XSS
- [ ] `10-command-injection`
- [ ] `11-ssti` — Server-Side Template Injection
- [ ] `12-path-traversal`
- [ ] `13-file-upload`

### Level 4 — Config & Crypto
- [ ] `14-security-misconfig` · `A05:2021`
- [ ] `15-cors-misconfig`
- [ ] `16-crypto-failures` · `A02:2021`
- [ ] `17-mass-assignment`
- [ ] `18-prototype-pollution`

### Level 5 — Advanced
- [ ] `19-ssrf` · `A10:2021`
- [ ] `20-xxe`
- [ ] `21-insecure-deserialization` · `A08:2021`
- [ ] `22-race-conditions`
- [ ] `23-redos`
- [ ] `24-request-smuggling`

> Checkboxes are ticked as each lab is completed.

---

## 🧱 Tech stack

Node.js + Express · SQLite (per-lab) · EJS / raw HTML · Docker Compose ·
mkdocs (writeups) · GitHub Actions (exploit tests run in CI).

## 📚 Writeups

Browse the documentation site: `cd docs && mkdocs serve` → http://localhost:8000

## 📜 License

MIT — for educational use. See [`LICENSE`](LICENSE).
