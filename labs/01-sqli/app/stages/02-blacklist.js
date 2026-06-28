'use strict';

// Stage 2 of the SQL injection lab — a first attempt to block the attack.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 2,
  slug: 'blacklist',
  title: 'Blacklist: strip the quote',
  defense: 'Strips single quotes from the input.',
  hint: "The naive payload fails now because the quote is removed. But look very closely at <em>how</em> it's removed: <code>str.replace(\"'\", '')</code>. In JavaScript, when the first argument is a string (not a regex), <code>.replace()</code> only replaces the <strong>first</strong> match. So how many quotes survive if you send two?",
  lesson: 'Blacklists are brittle — one implementation slip (non-global replace) reopens the hole.',
  explanation:
    "<code>str.replace(\"'\", '')</code> with a string argument removes only the <strong>first</strong> quote. " +
    "You sent two leading quotes (<code>''</code>), the filter stripped one, and the other survived to close the string — " +
    "exactly the stage-1 injection again. Blacklists fail by default: you can never enumerate every bypass.",
  status: 'vulnerable',

  createRouter(SQL, ctx) {
    const db = shared.seedUsers(SQL);
    const r = express.Router();

    r.get('/', (req, res) =>
      res.send(shared.stagePage(ctx, { content: shared.loginForm(ctx.mount) }))
    );

    r.post('/login', (req, res) => {
      let { username = '', password = '' } = req.body;

      username = username.replace("'", '');   //! BUG: string arg replaces only the FIRST quote, not all
      password = password.replace("'", '');

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
