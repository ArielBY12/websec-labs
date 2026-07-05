# Lab 16 — Cryptographic Failures

| | |
|---|---|
| **Tier** | 4 — Config & Crypto |
| **OWASP** | A02:2021 – Cryptographic Failures |
| **Difficulty** | medium |
| **Stages** | 5 vulnerable + 1 fixed |

## 🎯 The scenario
A session token carries your role, "protected" five different broken ways. Forge a token
the server accepts as `role: admin` and unlock the admin secret.

> A stage is solved when a forged token verifies as admin. Your own token (`alice|user`)
> is shown — use it as known plaintext where the attack needs it.

## 🧠 The one idea
Integrity comes from a **keyed MAC (or signature) under a strong secret**, verified in
constant time. Encoding, homemade ciphers, keyless hashes, and short keys all let an
attacker produce a valid token.

---

## Stage 1 — Plaintext token · `/stage/1`
`alice|user`, no protection. **Exploit:** send `admin|admin`.

## Stage 2 — Base64 "encryption" · `/stage/2`
`base64(alice|user)`. **Exploit:** `base64(admin|admin)` — encoding isn't encryption.

## Stage 3 — Repeating-key XOR · `/stage/3`
`base64(xor(payload, key))`. **Exploit:** `key = plaintext XOR ciphertext` (known-plaintext), then encrypt `admin|admin`.

## Stage 4 — Keyless hash as "MAC" · `/stage/4`
`base64(payload).md5(payload)`. **Exploit:** recompute `md5(admin|admin)` — a keyless hash isn't a MAC.

## Stage 5 — Weak HMAC key · `/stage/5`
`payload.hmac(payload, PIN)` with a 4-digit key. **Exploit:** brute-force the PIN offline from one token, then sign `admin|admin`.

## Stage 6 — HMAC with a strong random key · `/fixed`
```js
const KEY = crypto.randomBytes(32);
timingSafeEqual(sig, hmac(payload))   // 🟢
```
No forged payload can produce a valid MAC without the key; the genuine token still
verifies.

### ✅ Takeaways
- Use HMAC/signatures under a long random key; compare in constant time.
- Never invent ciphers; never treat encoding or keyless hashes as security.
- For confidentiality use authenticated encryption (AES-GCM) with random nonces.

## ▶️ Run it
```bash
npm run dev                              # → http://localhost:4016
# or: cd labs/16-crypto-failures && docker compose up
```

## 🧪 Tests
```bash
cd exploit && npm install && npm test
```
Each vulnerable stage must accept a forged admin token; `/fixed` must reject all
forgeries while still verifying the genuine token.
