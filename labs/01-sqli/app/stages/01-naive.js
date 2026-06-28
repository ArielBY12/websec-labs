'use strict';

// Stage 1 of the SQL injection lab — the baseline login, no input handling.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 1,
  slug: 'naive',
  title: 'Naive string concatenation',
  defense: 'None — this is the baseline, unguarded version.',
  hint: "Your input is placed inside the quotes of the SQL string. What happens if your input itself contains a single quote <code>'</code>? Can you close the string early and add your own logic? The <code>--</code> sequence starts a SQL comment.",
  lesson: 'Input concatenated into a query string becomes executable SQL, not data.',
  explanation:
    "Your <code>'</code> closed the username string early, so everything after it was read as SQL <em>code</em>, not as a value. " +
    "<code>OR 1=1</code> makes the condition always true and <code>--</code> comments out the password check. " +
    "The query stopped being \"find this user\" and became \"return rows where TRUE\".",
  status: 'vulnerable',

  createRouter(SQL, ctx) {
    const db = shared.seedUsers(SQL);
    const r = express.Router();

    r.get('/', (req, res) =>
      res.send(shared.stagePage(ctx, { content: shared.loginForm(ctx.mount) }))
    );

    r.post('/login', (req, res) => {
      const { username = '', password = '' } = req.body;

      const query =
        `SELECT id, username, role FROM users ` +
        `WHERE username = '${username}' AND password = '${password}'`;   //! input is concatenated straight into the SQL — it becomes code

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
