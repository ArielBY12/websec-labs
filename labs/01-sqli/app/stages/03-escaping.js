'use strict';

// Stage 3 of the SQL injection lab — a more thorough-looking attempt.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 3,
  slug: 'escaping',
  title: 'Wrong escaping (backslash)',
  defense: 'Escapes every quote in the input.',
  hint: "This time <em>all</em> quotes are handled — escaped with a backslash, MySQL-style (<code>'</code> → <code>\\'</code>). But which database engine is running here, and does it actually treat a backslash as an escape character? In standard SQL / SQLite, a quote is escaped by <strong>doubling</strong> it (<code>''</code>), not with <code>\\'</code>. Try a boolean payload like <code>' OR 1=1-- </code>.",
  lesson: 'Escaping is dialect-specific; applying the wrong dialect (MySQL rules on SQLite) gives no protection.',
  explanation:
    "SQLite does not treat <code>\\</code> as an escape character, so <code>\\'</code> is just a backslash followed by a " +
    "string-closing quote. Your quote still closed the string. A <code>' OR 1=1-- </code> payload works because it doesn't " +
    "need to match a username — it forces the whole condition true. (A username-targeted payload like <code>admin'-- </code> " +
    "fails here, because the stray <code>\\</code> gets glued onto the value: <code>admin\\</code> matches no one.)",
  status: 'vulnerable',

  createRouter(SQL, ctx) {
    const db = shared.seedUsers(SQL);
    const r = express.Router();

    r.get('/', (req, res) =>
      res.send(shared.stagePage(ctx, { content: shared.loginForm(ctx.mount) }))
    );

    r.post('/login', (req, res) => {
      let { username = '', password = '' } = req.body;

      username = username.replace(/'/g, "\\'");   //! WRONG: backslash isn't an escape char in SQLite — the quote still closes the string
      password = password.replace(/'/g, "\\'");

      const query =
        `SELECT id, username, role FROM users ` +
        `WHERE username = '${username}' AND password = '${password}'`;

      const result = shared.runRawQuery(db, query);
      res.send(
        shared.stagePage(ctx, {
          content: shared.loginForm(ctx.mount),
          result: { ...result, executedQuery: query },
        })
      );
    });

    return r;
  },
};
