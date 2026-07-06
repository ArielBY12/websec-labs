'use strict';

// Stage 2 — the form now carries a CSRF token, so the page *looks* protected.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 2,
  slug: 'unchecked',
  title: 'Token rendered, never checked',
  defense: 'Puts a CSRF token in the form.',
  hint: "The form has a hidden <code>csrf</code> field now — but does the server actually verify it? Switch the <strong>delivery origin</strong> to <strong>cross-site (evil.example)</strong> and deliver a <strong>POST</strong> with the token field left <strong>blank</strong>: the server never checks the token, so it still goes through.",
  lesson: "Rendering a token is not validating it — a token the server never checks is security theater.",
  explanation:
    "The token was embedded in the HTML but the handler never compared it to anything, so omitting it (or sending garbage) changed nothing. A cross-site attacker doesn't need to read a token the server ignores. Anti-CSRF only works when the server rejects requests whose token is missing or wrong.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const store = new Map();

    r.get('/', (req, res) => {
      const sess = shared.getSession(req, res, store);
      const VIEW = { tokenField: sess.token };
      res.send(shared.stagePage(ctx, { content: shared.accountView(ctx, sess, VIEW), success: sess.csrfSolved }));
    });

    r.post('/change-email', (req, res) => {
      const sess = shared.getSession(req, res, store);
      // The form supplies a `csrf` field, but we trust the cookie and update anyway.
      sess.email = req.body.email || sess.email;   //! the form includes a CSRF token, but the handler never compares it — an unchecked token defends nothing
      res.send(shared.stagePage(ctx, shared.afterChange(ctx, sess, req, { tokenField: sess.token })));
    });

    return r;
  },
};
