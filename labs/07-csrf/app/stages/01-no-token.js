'use strict';

// Stage 1 — the baseline: a state-changing action protected by nothing but the
// session cookie.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 1,
  slug: 'no-token',
  title: 'No CSRF protection',
  defense: 'None — the state change needs only the session cookie.',
  hint: "There's no anti-CSRF token anywhere. The browser attaches alice's session cookie to <em>any</em> request to this origin, including one triggered by another site. Just POST to <code>/change-email</code> with <code>email=attacker@evil.example</code> while her session cookie is present — no token, no Referer needed.",
  lesson: 'The session cookie proves the user is logged in, never that the user intended the request.',
  explanation:
    "The handler changed the email on the strength of the session cookie alone. Browsers send that cookie automatically on cross-site requests, so a hidden auto-submitting form on any page alice visits performs this exact change. Authentication is not intent — a state-changing request needs an unpredictable token the attacker cannot supply.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const store = new Map();

    r.get('/', (req, res) => {
      const sess = shared.getSession(req, res, store);
      res.send(shared.stagePage(ctx, { content: shared.accountCard(ctx, sess) }));
    });

    r.post('/change-email', (req, res) => {
      const sess = shared.getSession(req, res, store);
      sess.email = req.body.email || sess.email;   //! no anti-CSRF token is required — the state change runs on any request that carries the session cookie
      const forged = (req.body.csrf || '') !== sess.token;
      res.send(shared.stagePage(ctx, {
        content: shared.accountCard(ctx, sess),
        result: forged ? shared.changedBanner(sess) : shared.legitBanner(sess),
        success: forged,
      }));
    });

    return r;
  },
};
