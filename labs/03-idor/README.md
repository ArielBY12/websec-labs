# Lab 03 — Insecure Direct Object Reference (IDOR)

| | |
|---|---|
| **Tier** | 1 — Basics |
| **OWASP** | A01:2021 – Broken Access Control |
| **Difficulty** | easy |
| **Stages** | 3 vulnerable + 1 fixed |

## 🎯 The scenario
You're logged in as **alice**. The app lets you view your invoices at
`/invoice/:id`. The id is a *direct reference* to a database row — and the server
decides what to return based on that id, **not** on who you are. So changing the id
reaches invoices that belong to **bob** and **carol**. Bob's invoice (#102) is a
$250,000 "Project Nighthawk" retention bonus — exactly the kind of data access
control is supposed to protect.

> A stage is exploited when alice can read **bob's** invoice. The fixed stage must
> deny that on *every* route while still serving alice her own invoice — that's what
> the tests assert.

## 🧠 The one idea
**Fetching an object by id is not the same as being allowed to read it.** Every time
the server returns an object chosen by request input, it must check that the
*authenticated* user is authorized for *that specific object*. Skip that check — or
do it in only one place — and the id becomes a directory into everyone's data.

---

## Stage 1 — Direct id, no check · `/stage/1`
The invoice is fetched by the URL id and returned to anyone.

```js
const inv = shared.getInvoice(db, req.params.id);   // 🔴 no ownership check at all
```

**Exploit:** you own #101, so visit `/stage/1/invoice/102`.
**Root cause:** the handler authorizes nothing; the id alone decides the response.

## Stage 2 — "Unguessable" encoded id · `/stage/2`
First fix attempt: stop showing raw ids — hand out an *opaque* token instead, and
assume nobody can guess someone else's.

```js
const id = Number(Buffer.from(req.params.token, 'base64').toString('utf8')); // token is reversible; still no ownership check
```

**Exploit:** your link is `/invoice/MTAx`. Decode `MTAx` → `101`; encode `102` →
`MTAy`; visit `/stage/2/invoice/MTAy`.
**Why it fails:** the token is just base64 of the id — reversible — and even a truly
random id wouldn't help, because there's still **no authorization check**. Obscurity
delays enumeration; it never grants permission.

## Stage 3 — Check on the page, not the export · `/stage/3`
A real ownership check is finally added to `/invoice/:id` (try `102` → *Access
denied*). But the app also has a **print** route, added separately…

```js
// /invoice/:id        → checks owner_id === ME ✅
// /invoice/:id/print  → returns the invoice with NO check ❌
const inv = shared.getInvoice(db, req.params.id);   // the print route forgot the guard
```

**Exploit:** `/stage/3/invoice/102/print`.
**Why it fails:** the object is reachable through more than one path and only one was
guarded. Attackers don't use your intended route — they find the one you forgot.

## Stage 4 — Per-object authorization · `/fixed`
One guard, applied on **every** route, deny by default.

```js
const authorize = (id) => {
  const inv = shared.getInvoice(db, id);
  return inv && inv.owner_id === ME ? inv : null;   // 🟢 returns the invoice only if it's yours
};
// both /invoice/:id and /invoice/:id/print go through authorize()
```

Now guessing or encoding another user's id just yields *Access denied* — permission
is decided by **who you are**, not by **which id you asked for**. Alice still sees
her own #101 and #104.

### ❌ Common wrong "fixes" (and why they fail)
- **Random / encoded / UUID ids** — obscurity, not authorization (Stage 2).
- **Hiding the link in the UI** — the endpoint is still directly reachable.
- **Checking on one route** — the export/API/mobile route still leaks (Stage 3).
- **Trusting a client-supplied "user id"** (header, cookie, form field) — the
  attacker just sets it; authorize against the *server-side* session identity.

### ✅ Takeaways
- **Authorize every object access against the authenticated user**, for the specific
  object requested.
- **Centralize** the check (one `authorize()` / middleware) and **deny by default**,
  so no route can silently skip it.
- Unpredictable ids are at best defense-in-depth, never the control itself.

## ▶️ Run it
```bash
# from the repo root — runs the hub + every lab, including this one
npm run dev                              # → http://localhost:4003

# or just this lab in Docker
cd labs/03-idor && docker compose up
```
Open `/` for the stage menu, read each stage's source, and try to read bob's
invoice (#102) — then watch it turn into *Access denied* at `/fixed`.

## 🧪 Tests
```bash
cd exploit && npm install && npm test
```
Each vulnerable stage must let alice read bob's invoice; `/fixed` must deny it on
both the view and print routes while still serving alice her own.
