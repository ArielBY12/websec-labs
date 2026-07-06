# Lab 08 — Identification & Authentication Failures

| | |
|---|---|
| **Tier** | 2 — Auth & Access |
| **OWASP** | A07:2021 – Identification and Authentication Failures |
| **Difficulty** | medium |
| **Stages** | 5 vulnerable + 1 fixed |

## 🎯 The scenario
You hold a low-privilege account, **`sam:bluebird`**. The prize is the **admin**
account, whose console holds the flag `FLAG{auth_takeover}`. Each stage exposes a
*different* authentication weakness that lets you take admin over — until a hardened
login closes all of them.

> A stage is solved when you reach the admin console (the flag). The fixed stage must
> reject every takeover while still letting a genuine user log in — that's what the
> tests assert.

## 🧠 The one idea
Authentication only holds if trust rests on something **only the real server-and-user
pair can produce**: a strong secret, an unpredictable token, a server-issued session,
an integrity-protected cookie. Every stage here trusts something the attacker controls
or can guess instead.

---

## Stage 1 — No lockout · `/stage/1`
Known admin username, a weak password, and **no** rate limit, lockout, or CAPTCHA.

```js
if (!acct || acct.password !== password) return deny();   // 🔴 unlimited guesses
```

**Exploit:** point a small wordlist at `POST /login` with `username=admin`; `sunshine`
lands.
**Root cause:** weak password + no throttle = practical online brute force.

## Stage 2 — Username enumeration · `/stage/2`
The admin username is hidden, but the login answers *differently* for an unknown user
versus a known user with a wrong password.

```js
if (!acct)            return deny('No account with that username.');   // 🔴 oracle
if (acct.password !== password) return deny('Incorrect password for that account.');
```

**Exploit:** probe candidate names; the "wrong password" response reveals `superadmin`
exists. A lazy default-password policy (password = username) finishes it.
**Root cause:** distinct responses (or timings) leak which accounts exist.

## Stage 3 — Predictable reset token · `/stage/3`
The admin password is now strong, but `POST /forgot` mints **sequential** reset tokens.

```js
if (users[username]) tokens.set(username, String(counter++));   // 🔴 guessable next value
```

**Exploit:** reset your own account, read the token in your inbox (`GET /inbox?user=sam`),
then request an admin reset and use the **next** counter value on `POST /reset`.
**Root cause:** reset tokens must be CSPRNG, single-use, and expiring.

## Stage 4 — Session fixation · `/stage/4`
Logins are properly verified, but the session id is taken from the client and **kept**
across login instead of being regenerated.

```js
let sid = cookies.lab8_sid || req.query.sid;   // 🔴 client-settable, never rotated
...
sessions.set(sid, { name, role });             // same sid kept at login
```

**Exploit:** fix a session id, get the admin to authenticate on it (`GET /victim-visit`
stands in for the phished admin), then use that same id.
**Root cause:** attacker-settable + non-rotated session ids enable fixation.

## Stage 5 — Forgeable "remember me" cookie · `/stage/5`
A persistent-login cookie encodes the username with no integrity protection.

```js
const name = Buffer.from(cookie.lab8_remember, 'base64').toString();   // 🔴 unsigned identity
if (users[name]) return { name, role: users[name].role };
```

**Exploit:** set `lab8_remember` to `base64("admin")` — no session, no password needed.
**Root cause:** an unsigned identity token is attacker-forgeable; sign it or use an
opaque server-side handle.

## Stage 6 — Verified, hardened authentication · `/fixed`
Constant-time verification against a salted hash, one generic error, lockout, random
single-use reset tokens, a fresh session id at login, and an HMAC-signed remember cookie.

```js
if (!verify(username, password)) { fails.set(username, n+1); return deny(GENERIC); }  // 🟢
const sid = crypto.randomBytes(16).toString('hex');   // rotate at login
if (remember) setCookie(`lab8_remember=${signRemember(username)}`);   // signed
```

Brute force (strong password + lockout), enumeration (one generic message + equalized
timing), token prediction (CSPRNG), fixation (rotation, no URL sid), and the forged
cookie (signature check) all fail — while `sam:bluebird` still logs in.

### ❌ Common wrong "fixes" (and why they fail)
- **A stronger message but still distinct** for unknown vs wrong-password — still an oracle.
- **A longer but sequential/timestamped reset token** — still predictable.
- **Rotating the session id but still reading `?sid=`** — still fixable.
- **Encrypting the remember cookie with a static/guessable key** — forgeable if the key leaks.
- **Comparing passwords/tokens with `===`** on raw strings — timing side-channel; hash + constant-time compare.

### ✅ Takeaways
- Throttle and lock out; forbid weak/breached passwords.
- One generic failure message and equal timing.
- CSPRNG, single-use, expiring reset tokens.
- Regenerate the session id at login; never accept it from a URL.
- Sign/encrypt persistent-auth cookies, or make them opaque handles.

## ▶️ Run it
```bash
# from the repo root — runs the hub + every lab, including this one
npm run dev                              # → http://localhost:4008

# or just this lab in Docker
cd labs/08-auth-failures && docker compose up
```

## 🧪 Tests
```bash
cd exploit && npm install && npm test
```
Each vulnerable stage must yield an admin takeover (brute force, enumeration, reset
prediction, fixation, forged cookie); `/fixed` must resist all five while still
accepting `sam:bluebird`.
