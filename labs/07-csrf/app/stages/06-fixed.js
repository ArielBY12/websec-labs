'use strict';

// Stage 6 — the fix: an unpredictable per-session token, verified in constant time
// on every state-changing request. GET can't change state; the cookie is SameSite.

const express = require('express');
const crypto = require('crypto');
const shared = require('../shared');

function safeEqual(a, b) {
  const ba = Buffer.from(String(a)), bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

module.exports = {
  stage: 6,
  slug: 'fixed',
  title: 'Per-session token, verified',
  defense: 'Requires an unpredictable per-session token on every state change; SameSite cookie.',
  hint: '',
  lesson: 'Bind an unpredictable token to the session, verify it in constant time on every state-changing request, and add SameSite cookies as defense-in-depth.',
  explanation:
    "Every state-changing request must carry the session's own random token, checked in constant time — a value the attacker can never read cross-origin (the same-origin policy blocks reading alice's page). GET performs no change, so no <img> trick works, and the SameSite=Strict cookie stops the browser attaching the session on cross-site requests at all. The missing token, unchecked token, static token, GET route, and spoofed Referer all fail here.",
  status: 'secure',

  createRouter(ctx) {
    const r = express.Router();
    const store = new Map();

    const view = (sess) => ({ tokenField: sess.token });

    r.get('/', (req, res) => {
      const sess = shared.getSession(req, res, store, { sameSite: true });
      res.send(shared.stagePage(ctx, { content: shared.accountView(ctx, sess, view(sess)) }));
    });

    r.post('/change-email', (req, res) => {
      const sess = shared.getSession(req, res, store, { sameSite: true });
      if (!req.body.csrf || !safeEqual(req.body.csrf, sess.token))   //! require the unpredictable per-session token, compared in constant time, on every state-changing request
        return res.send(shared.stagePage(ctx, { content: shared.accountView(ctx, sess, view(sess)), result: shared.deniedBanner() }));
      sess.email = req.body.email || sess.email;
      res.send(shared.stagePage(ctx, { content: shared.accountView(ctx, sess, view(sess)), result: shared.legitBanner(sess) }));
    });

    return r;
  },
};
