# 🛡️ WebSec Labs

A hands-on, level-based collection of intentionally vulnerable web labs covering the
**OWASP Top 10** and beyond. Each lab is a single app built as **progressive stages**:

- 🔴 **Vulnerable stages** (`app/stages/`) — the feature implemented the *wrong* way.
  Each stage adds a stronger but still-bypassable defense than the last.
- 🟢 **Fixed stage** — the same feature done securely: the real fix (one per lab).
- 💥 **Exploit tests** (`exploit/`) — a PoC per vulnerable stage, plus automated tests
  proving each vulnerable stage is exploitable and the fixed stage resists them all.

Each lab also has a **writeup** (its `README.md`) explaining every stage's
vulnerability, the bypass, the root cause, and how to fix it properly.

> ⚠️ **Warning — intentionally vulnerable code.** These apps contain real
> vulnerabilities for educational purposes. Run them **only** locally / inside Docker.
> Never deploy them to a public server.

---

## 🚀 Quick start

```bash
# Run EVERYTHING — the hub + every lab — with one command
npm install && npm run dev
# → hub on http://localhost:3000, each lab live on its own port
# (first run auto-installs each lab's deps; Ctrl+C stops all)
```

Prefer to run pieces on their own?

```bash
# Just the hub dashboard (lists every lab + status)
cd hub && npm install && npm start          # → http://localhost:3000

# A single lab in Docker (all stages: vulnerable → fixed)
cd labs/01-sqli && docker compose up        # → http://localhost:4001
```

Works the same on macOS, Linux, and Windows (Node.js LTS required).

---

## 🗺️ Vulnerability map

### Level 1 — Basics
- [x] `01-sqli` — SQL Injection · `A03:2021 Injection`
- [x] `02-xss-reflected` — Reflected XSS · `A03:2021 Injection`
- [x] `03-idor` — Insecure Direct Object Reference · `A01:2021 Broken Access Control`
- [x] `04-open-redirect` — Open Redirect

### Level 2 — Auth & Access
- [x] `05-broken-access-control` · `A01:2021`
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
GitHub Actions (exploit tests run in CI).

## 📚 Writeups

Each lab's writeup lives in `labs/<id>/README.md` (per-stage vuln · bypass · root
cause · fix). The hub surfaces it: start it (`cd hub && npm start`), open a lab at
`http://localhost:3000/lab/<id>`, and click **📖 Writeup**.

## 📜 License

MIT — for educational use. See [`LICENSE`](LICENSE).
