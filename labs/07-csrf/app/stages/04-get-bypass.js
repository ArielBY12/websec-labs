'use strict';

// Stage 4 — a proper unpredictable per-session token is verified on POST. But the
// same action is also wired up over GET for "convenience".

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 4,
  slug: 'get-bypass',
  title: 'Token checked only on POST',
  defense: 'Verifies a per-session token on POST.',
  hint: "The POST handler now checks a real per-session token you can't guess — a cross-site POST with a blank token is rejected. But is POST the only route? Set the <strong>delivery origin</strong> to <strong>cross-site (evil.example)</strong>, switch the method to <strong>GET</strong> (an <code>&lt;img&gt;</code>/link does this cross-site), and deliver: the GET route skips the token check entirely.",
  lesson: 'Enforce the CSRF check on every state-changing method; never expose a state change over GET, which a link or <img> triggers with no token.',
  explanation:
    "The token check lived only on the POST route, while a convenience GET route performed the same change with no check at all. An attacker embeds <code>&lt;img src=\"/change-email?email=attacker@evil.example\"&gt;</code> on any page; the browser fires the GET with alice's cookie and skips the token entirely. State-changing actions must be POST-only and every one must verify the token.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const store = new Map();
    const view = (sess) => ({ tokenField: sess.token });

    r.get('/', (req, res) => {
      const sess = shared.getSession(req, res, store);
      res.send(shared.stagePage(ctx, { content: shared.accountView(ctx, sess, view(sess)), success: sess.csrfSolved }));
    });

    // Convenience GET endpoint — mirrors the POST action.
    r.get('/change-email', (req, res) => {
      const sess = shared.getSession(req, res, store);
      sess.email = req.query.email || sess.email;   //! the same state change is exposed over GET with no token check — an <img> or link forges it cross-site
      res.send(shared.stagePage(ctx, shared.afterChange(ctx, sess, req, view(sess))));
    });

    r.post('/change-email', (req, res) => {
      const sess = shared.getSession(req, res, store);
      if (req.body.csrf !== sess.token)
        return res.send(shared.stagePage(ctx, { content: shared.accountView(ctx, sess, view(sess)), result: shared.deniedBanner() }));
      sess.email = req.body.email || sess.email;
      res.send(shared.stagePage(ctx, shared.afterChange(ctx, sess, req, view(sess))));
    });

    return r;
  },
};
