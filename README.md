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

## 📚 The curriculum

**23 labs across five levels of increasing depth.** Each is self-contained — a drop-in
`lab.json` the hub auto-discovers — with progressive stages (vulnerable → fixed) and
exploit tests.

### Level 1 — Basics
*First-contact web bugs: injection and direct-access mistakes.*
- `01-sqli` — SQL Injection · `A03:2021 Injection`
- `02-xss-reflected` — Reflected XSS · `A03:2021 Injection`
- `03-idor` — Insecure Direct Object Reference · `A01:2021 Broken Access Control`
- `04-open-redirect` — Open Redirect

### Level 2 — Auth & Access
*Identity, sessions, and authorization — who you are and what you may do.*
- `05-broken-access-control` — Broken Access Control · `A01:2021`
- `06-jwt-attacks` — JWT Attacks · `A07:2021`
- `07-csrf` — Cross-Site Request Forgery · `A01:2021 Broken Access Control`
- `08-auth-failures` — Identification & Authentication Failures · `A07:2021`

### Level 3 — Injection+
*Untrusted input reaching a dangerous sink — scripts, commands, templates, files, paths.*
- `09-xss-stored` — Stored XSS · `A03:2021 Injection`
- `10-command-injection` — OS Command Injection · `A03:2021 Injection`
- `11-ssti` — Server-Side Template Injection · `A03:2021 Injection`
- `12-path-traversal` — Path Traversal · `A01:2021 Broken Access Control`
- `13-file-upload` — Unrestricted File Upload · `A03:2021 Injection`

### Level 4 — Config & Crypto
*Insecure defaults, weak cryptography, and over-permissive data binding.*
- `14-security-misconfig` — Security Misconfiguration · `A05:2021`
- `15-cors-misconfig` — CORS Misconfiguration · `A05:2021`
- `16-crypto-failures` — Cryptographic Failures · `A02:2021`
- `17-mass-assignment` — Mass Assignment · `A08:2021`
- `18-prototype-pollution` — Prototype Pollution · `A08:2021`

### Level 5 — Advanced
*Server-side and protocol-level attacks — SSRF, XXE, deserialization, concurrency, DoS.*
- `19-ssrf` — Server-Side Request Forgery · `A10:2021`
- `20-xxe` — XML External Entity · `A05:2021`
- `21-insecure-deserialization` — Insecure Deserialization · `A08:2021`
- `22-race-conditions` — Race Conditions · `A04:2021`
- `23-redos` — Regular Expression DoS · `A06:2021`

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
