'use strict';

// Stage 2 — the form now carries a CSRF token, so the page *looks* protected.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 2,
  slug: 'unchecked',
  title: 'Token rendered, never checked',
  defense: 'Puts a CSRF token in the form.',
  hint: "The form has a hidden <code>csrf</code> field now — but does the server actually verify it? Read the POST handler. Try forging the request <em>without</em> the token field at all (or with any junk value) and watch it still go through.",
  lesson: "Rendering a token is not validating it — a token the server never checks is security theater.",
  explanation:
    "The token was embedded in the HTML but the handler never compared it to anything, so omitting it (or sending garbage) changed nothing. A cross-site attacker doesn't need to read a token the server ignores. Anti-CSRF only works when the server rejects requests whose token is missing or wrong.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const store = new Map();

    r.get('/', (req, res) => {
      const sess = shared.getSession(req, res, store);
      res.send(shared.stagePage(ctx, { content: shared.accountCard(ctx, sess, { tokenField: sess.token }) }));
    });

    r.post('/change-email', (req, res) => {
      const sess = shared.getSession(req, res, store);
      // The form supplies a `csrf` field, but we trust the cookie and update anyway.
      sess.email = req.body.email || sess.email;   //! the form includes a CSRF token, but the handler never compares it — an unchecked token defends nothing
      const forged = (req.body.csrf || '') !== sess.token;
      res.send(shared.stagePage(ctx, {
        content: shared.accountCard(ctx, sess, { tokenField: sess.token }),
        result: forged ? shared.changedBanner(sess) : shared.legitBanner(sess),
        success: forged,
      }));
    });

    return r;
  },
};
