# Lab 06 — JWT Attacks

| | |
|---|---|
| **Tier** | 2 — Auth & Access |
| **OWASP** | A07:2021 – Identification and Authentication Failures |
| **Difficulty** | medium |
| **Stages** | 5 vulnerable + 1 fixed |

## 🎯 The scenario
Your session is a **JWT** — `header.payload.signature`, base64url-encoded — carrying
`{"user":"alice","role":"user"}`. The app reads `role` from it to gate the admin area.
Send your token as `Authorization: Bearer <jwt>` or the `token` cookie. The goal: make
the server believe you're `role:admin`.

> A stage is solved when a forged/altered token gets you into `/admin` (the "🔑 Admin
> area"). The fixed stage must reject every forgery while still accepting a genuine
> token — that's what the tests assert.

## 🧠 The one idea
A JWT's payload is **encoded, not protected** — anyone can read and rewrite it. The
*only* thing that makes a claim trustworthy is a **signature you verify**, with an
algorithm **you** pin and a secret strong enough not to be guessed. Skip any of those
and the token becomes attacker-writable.

---

## Stage 1 — Signature never verified · `/stage/1`
The server decodes the payload and trusts `role` — no signature check.

```js
const payload = parseJwt(tokenFrom(req)).payload;   // 🔴 never verified
if (payload?.role !== 'admin') deny;
```

**Exploit:** decode the payload, change `"role":"user"` → `"admin"`, re-encode, send it
back (any signature).
**Root cause:** decoding ≠ verifying. Unverified claims are just attacker input.

## Stage 2 — Accepts alg=none · `/stage/2`
Now HS256 is verified — *unless* the token says it doesn't need to be.

```js
if (header.alg === 'none') role = payload.role;     // trust with no signature
else if (verifyHS256(token, SECRET)) role = payload.role;
```

**Exploit:** craft `base64url({"alg":"none"}).base64url({"role":"admin"}).` (empty
signature, trailing dot).
**Why it fails:** the token chose its own verification. `alg:none` is the JWT spec's
"unsecured" mode — never honor it. **Pin the algorithm server-side.**

## Stage 3 — Weak signing secret · `/stage/3`
The signature is verified correctly with HS256 — but the secret is a dictionary word.

```js
const SECRET = 'secret';                              // guessable
const ok = header.alg === 'HS256' && verifyHS256(token, SECRET);
```

**Exploit:** crack the secret offline from one captured token (`hashcat -m 16500`, or
`jwt_tool`/`john` with `rockyou.txt`), then sign your own `{"role":"admin"}` token with
it.
**Why it fails:** HMAC is only as strong as its key. A guessable secret lets the
attacker mint perfectly valid tokens.

## Stage 4 — `kid` header chooses the key file · `/stage/4`
HS256 is verified with a strong key — but the key is loaded from the file named in the
token's `kid` (key id) header, which the attacker controls.

```js
const key = fs.readFileSync(path.join(KEYS_DIR, header.kid));   // attacker controls kid
if (verifyHS256(token, key)) role = payload.role;
```

**Exploit:** set `kid` to `../../../../../../dev/null` (path traversal to an empty
file) and sign the token with an **empty** key.
**Why it fails:** key selection trusted a token header. Pointing `kid` at a file whose
contents you know (`/dev/null` → empty) lets you sign with that known key. Pin the key
server-side, or map `kid` through a strict allowlist — never a file path.

## Stage 5 — RS256 / HS256 algorithm confusion · `/stage/5`
Tokens are now **RS256**: signed with a private key, verified with the **public** key
(which is published, like a real JWKS). You can't forge RS256… but the verifier picks
its method from the token's `alg`.

```js
if (header.alg === 'RS256') ok = verifyRS256(token, PUBLIC_KEY);
else if (header.alg === 'HS256') ok = verifyHS256(token, PUBLIC_KEY);  // public key as HMAC secret!
```

**Exploit:** take the public-key PEM, switch `alg` to `HS256`, and HMAC-sign your
`{"role":"admin"}` token using that PEM as the secret.
**Why it fails:** the same key was reused for two algorithms. The RSA public key is
known to everyone, so when it's treated as an HMAC secret, anyone can forge a valid
HS256 token. **Pin the algorithm** and use a key appropriate to it.

## Stage 6 — Verified, pinned algorithm · `/fixed`
Pin `alg` to HS256 and verify against a long, random server-held secret before trusting
anything — never reading `kid`, never switching keys by algorithm.

```js
const valid = header?.alg === 'HS256' && verifyHS256(token, STRONG_SECRET);   // 🟢
if (!valid) return deny('invalid token');
if (payload.role !== 'admin') return deny('admin only');
```

Every earlier forgery — tampered claims, `alg:none`, a weak-secret signature, the
`kid` path-traversal key, and the RS256→HS256 public-key trick — fails, because none of
them was signed with the real server secret. Only alice's genuine token still signs her in.

### ❌ Common wrong "fixes" (and why they fail)
- **Decoding and "checking" claims** without verifying the signature — Stage 1.
- **Verifying with the algorithm from the token header** — lets `alg:none` / RS256→HS256
  confusion through. Pin it.
- **A short / wordlist secret** — brute-forced offline (Stage 3).
- **Selecting the key from `kid`** (file path, URL, or DB lookup) — attacker-controlled.
- **Reusing one key across algorithms** — the RSA public key becomes an HMAC secret.
- **Verifying once at login** but trusting the raw cookie afterwards — verify every request.

### ✅ Takeaways
- Verify the **signature** before reading any claim; decoding proves nothing.
- **Pin the algorithm** and the **key**; reject `none`, unexpected algs, and `kid` hints.
- Use a **high-entropy secret** (or asymmetric keys) kept out of source.

## ▶️ Run it
```bash
# from the repo root — runs the hub + every lab, including this one
npm run dev                              # → http://localhost:4006

# or just this lab in Docker
cd labs/06-jwt-attacks && docker compose up
```
Open `/` to see (and copy) your token, read each stage's source, and try to reach
`/admin` as an admin — then watch `/fixed` reject every forgery.

## 🧪 Tests
```bash
cd exploit && npm install && npm test
```
Each vulnerable stage must be forgeable into admin; `/fixed` must reject all five
forgeries (tampered, `alg:none`, weak-secret, `kid` traversal, RS256→HS256 confusion)
while still accepting a genuine token.
