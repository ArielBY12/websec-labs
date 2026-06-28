# Lab 01 — SQL Injection

| | |
|---|---|
| **Tier** | 1 — Basics |
| **OWASP** | A03:2021 – Injection |
| **Difficulty** | easy |
| **Stages** | 3 vulnerable + 1 fixed |

A members' login form looks up a user by `username` and `password`. Across four
stages the developer keeps "fixing" the injection the wrong way — each stage
adds a stronger-looking defense that is still bypassable — until the real fix.

> ⚠️ Intentionally vulnerable. Run locally only.

## ▶️ Run it

```bash
cd app && npm install && npm start      # → http://localhost:4001
# or, isolated:
docker compose up                        # → http://localhost:4001
```

Open `/` for the stage menu. Each stage page shows the **login form**, the
**executed query** (what your input did), and a collapsible **Vulnerable source**
panel (the exact code running, with the security-relevant line highlighted).

Seeded users: `admin`, `alice`, `bob`. You are not given the passwords.

## 🧠 The one idea behind all of it

Input is supposed to be **data** (a value to compare against). The moment you
build SQL by gluing input into the query string, the input can become **code** —
it changes what the query *does*. Every stage below is a different failed attempt
to stop that without addressing the real cause.

---

## Stage 1 — Naive string concatenation · `/stage/1`

```js
const query =
  `SELECT id, username, role FROM users ` +
  `WHERE username = '${username}' AND password = '${password}'`;
```

**Exploit:** username `' OR 1=1-- `, any password.

```
SELECT ... WHERE username = '' OR 1=1-- ' AND password = 'x'
```

The `'` closes the string, `OR 1=1` makes the condition always true, and `-- `
comments out the password check. You log in as the first user (`admin`).

**Root cause:** input is concatenated into the query, so it can break out of the
quoted string and add logic.

## Stage 2 — Blacklist: strip the quote · `/stage/2`

```js
username = username.replace("'", '');   // 🟠 first match only!
password = password.replace("'", '');
```

The developer removes single quotes so input can't break out. The naive payload
`' OR 1=1-- ` now fails. **But** `String.prototype.replace(string, …)` replaces
only the **first** occurrence, not all of them.

**Exploit:** username `'' OR 1=1-- ` → the first quote is stripped, leaving
`' OR 1=1-- ` — injected again.

**Root cause:** blacklisting is brittle. Here a single misunderstanding of the
API (string arg vs. global regex) reopens the hole. Blacklists fail by default;
you can never enumerate every bypass.

## Stage 3 — Wrong escaping (backslash) · `/stage/3`

```js
username = username.replace(/'/g, "\\'");   // 🟠 ' becomes \'
password = password.replace(/'/g, "\\'");
```

This time **every** quote is escaped, MySQL-style (`'` → `\'`). Looks thorough.
**But** SQLite — and the SQL standard — do **not** treat backslash as an escape
character. A quote is escaped by *doubling* it (`''`), not by `\'`. So `\'` is
just a backslash followed by a string-closing quote.

**Exploit:** username `' OR 1=1-- ` still works. The escaped `\'` closes the
string anyway:

```
SELECT ... WHERE username = '\' OR 1=1-- ' ...
```

**Root cause:** escaping is database-specific and easy to get wrong. Using the
wrong dialect's rules is no protection at all.

## Stage 4 — Parameterized query (the fix) · `/fixed`

```js
const sql =
  `SELECT id, username, role FROM users ` +
  `WHERE username = ? AND password = ?`;
db.prepare(sql).bind([username, password]);   // 🟢 values bound separately
```

The SQL text is fixed and the values are sent to the driver **separately** from
the query. Input can never change the structure of the statement, so every
payload above is treated as a literal string to match — and matches no one.
Valid credentials still work.

### Why this is the actual fix (and the others aren't)
The earlier stages all tried to *clean the input*. Parameterization removes the
problem at its source: input never enters the SQL grammar, so there is nothing
to escape or blacklist.

### ❌ Common wrong "fixes" (and why they fail)
- **Blacklisting characters/keywords** — endless bypasses (encodings, case,
  comments, alternate syntax). You can't enumerate all bad input.
- **Manual escaping** — dialect-specific and fragile (Stage 3). One wrong
  assumption and it's bypassable.
- **Stored procedures that still concatenate** — moving the concatenation
  inside the DB doesn't help.
- **Hiding SQL errors only** — verbose errors help an attacker, but removing
  them doesn't stop the injection (it just makes it blind).

### ✅ Takeaways
- Use **parameterized queries / prepared statements** for every query with
  dynamic values. This is non-negotiable.
- Add defense in depth: **least-privilege DB users**, allow-list validation for
  things that can't be parameters (e.g. column/table names), and least-verbose
  errors in production.
- Note: in this lab the DB is SQLite-in-WASM (`sql.js`) so there are no DB roles;
  in real Postgres/MySQL you'd also grant the app user only what it needs.

## 🧪 Tests

```bash
cd exploit && npm install && npm test
```

Proves each vulnerable stage's PoC succeeds, the fixed stage resists all of them,
valid credentials still log in, and `lab.json` matches the stage modules.
