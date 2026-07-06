'use strict';

// Stage 3 — the token is finally verified. But it is a single value baked into the
// site, the same for every user and every session.

const express = require('express');
const shared = require('../shared');

const SITE_TOKEN = 'csrf-shared-2024';

module.exports = {
  stage: 3,
  slug: 'static-token',
  title: 'Static site-wide token',
  defense: 'Validates a CSRF token against a fixed site constant.',
  hint: "The token is checked for real now — but it's the same value in every user's form. Read the hidden <code>csrf</code> value from alice's form above, paste it into the console's <strong>token</strong> field, set the <strong>delivery origin</strong> to <strong>cross-site (evil.example)</strong>, and deliver a <strong>POST</strong>: the static token isn't tied to her session, so it's accepted.",
  lesson: 'A CSRF token must be unpredictable AND bound to the session — a site-wide constant is known to every attacker.',
  explanation:
    "The server compared the token to one constant shared by all users, so the attacker simply reads the token from their own copy of the page and includes it — it's identical to alice's. A token only stops forgery when it's tied to the victim's session, so the attacker's own value never validates the victim's request.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const store = new Map();
    const VIEW = { tokenField: SITE_TOKEN };

    r.get('/', (req, res) => {
      const sess = shared.getSession(req, res, store);
      res.send(shared.stagePage(ctx, { content: shared.accountView(ctx, sess, VIEW), success: sess.csrfSolved }));
    });

    r.post('/change-email', (req, res) => {
      const sess = shared.getSession(req, res, store);
      if (req.body.csrf !== SITE_TOKEN)   //! the token is a single site-wide constant, identical for every session — not bound to alice
        return res.send(shared.stagePage(ctx, { content: shared.accountView(ctx, sess, VIEW), result: shared.deniedBanner() }));
      sess.email = req.body.email || sess.email;
      res.send(shared.stagePage(ctx, shared.afterChange(ctx, sess, req, VIEW)));
    });

    return r;
  },
};
