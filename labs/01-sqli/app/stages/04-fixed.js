'use strict';

// Stage 4 of the SQL injection lab — the correct fix.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 4,
  slug: 'fixed',
  title: 'Parameterized query (the fix)',
  defense: 'Bound parameters — the input never enters the SQL text.',
  hint: '',
  lesson: 'Parameterized queries keep input as data; there is nothing to escape or blacklist.',
  explanation:
    "The SQL text is compiled with <code>?</code> placeholders before any value is seen, then the values are bound " +
    "separately as data. Input can never change the query's structure, so every earlier payload is just a literal " +
    "string to compare against — and matches no user.",
  status: 'secure',

  createRouter(SQL, ctx) {
    const db = shared.seedUsers(SQL);
    const r = express.Router();

    r.get('/', (req, res) =>
      res.send(shared.stagePage(ctx, { content: shared.loginForm(ctx.mount) }))
    );

    r.post('/login', (req, res) => {
      const { username = '', password = '' } = req.body;

      const sql =
        `SELECT id, username, role FROM users ` +
        `WHERE username = ? AND password = ?`;   //! SECURE: placeholders compiled first; values bound separately as data

      const result = shared.runParamQuery(db, sql, [username, password]);
      res.send(
        shared.stagePage(ctx, {
          content: shared.loginForm(ctx.mount),
          result: {
            ...result,
            executedQuery: sql,
            paramNote: 'Prepared statement — values bound separately (shown with ? placeholders):',
          },
        })
      );
    });

    return r;
  },
};
