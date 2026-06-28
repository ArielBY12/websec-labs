# WebSec Labs

A hands-on, level-based collection of intentionally vulnerable web labs covering the
**OWASP Top 10** and beyond.

!!! warning "Intentionally vulnerable"
    These labs contain real vulnerabilities for educational purposes. Run them
    **only** locally or inside Docker. Never deploy them publicly.

## How each lab works

Every lab ships in three layers:

- 🔴 **Vulnerable** — the feature implemented with the wrong pattern
- 🟢 **Fixed** — the same feature, done securely
- 💥 **Exploit** — a working PoC and an automated test that proves the bug

## Levels

1. **Basics** — SQLi, Reflected XSS, IDOR, Open Redirect
2. **Auth & Access** — Broken Access Control, JWT, CSRF, Auth failures
3. **Injection+** — Stored XSS, Command Injection, SSTI, Path Traversal, File Upload
4. **Config & Crypto** — Misconfig, CORS, Crypto Failures, Mass Assignment, Prototype Pollution
5. **Advanced** — SSRF, XXE, Deserialization, Race Conditions, ReDoS, Request Smuggling

Writeups for completed labs appear in the navigation on the left.
