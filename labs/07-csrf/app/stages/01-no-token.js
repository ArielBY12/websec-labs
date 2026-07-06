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
  hint: "A blind click delivers a <em>same-site</em> request — that's alice's own legitimate action, not an attack. There's no anti-CSRF token anywhere, so switch the <strong>delivery origin</strong> to <strong>cross-site (evil.example)</strong>, keep <strong>POST</strong> with a <strong>blank</strong> token, and deliver: the forged request carries only alice's cookie, and the change goes through.",
  lesson: 'The session cookie proves the user is logged in, never that the user intended the request.',
  explanation:
    "The handler changed the email on the strength of the session cookie alone. Browsers send that cookie automatically on cross-site requests, so a hidden auto-submitting form on any page alice visits performs this exact change. Authentication is not intent — a state-changing request needs an unpredictable token the attacker cannot supply.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const store = new Map();
    const VIEW = {};

    r.get('/', (req, res) => {
      const sess = shared.getSession(req, res, store);
      res.send(shared.stagePage(ctx, { content: shared.accountView(ctx, sess, VIEW), success: sess.csrfSolved }));
    });

    r.post('/change-email', (req, res) => {
      const sess = shared.getSession(req, res, store);
      sess.email = req.body.email || sess.email;   //! no anti-CSRF token is required — the state change runs on any request that carries the session cookie
      res.send(shared.stagePage(ctx, shared.afterChange(ctx, sess, req, VIEW)));
    });

    return r;
  },
};
