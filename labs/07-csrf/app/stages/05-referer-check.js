'use strict';

// Stage 5 — a different defense: instead of a token, gate the request on the
// Referer header naming the site.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 5,
  slug: 'referer-check',
  title: 'Referer-based defense',
  defense: 'Accepts the request only if the Referer names the site.',
  hint: `No token this time — the server accepts the POST only when the Referer header mentions <code>${shared.SITE}</code>. But how is "mentions" implemented? A substring test matches <code>https://${shared.SITE}.attacker.com/</code>. And what happens when there's no Referer at all?`,
  lesson: 'Referer/Origin allowlisting is fragile — substring matches and an absent Referer are trivially bypassed; prefer tokens and SameSite.',
  explanation:
    `The check used a substring match and also let requests through when the Referer was absent. An attacker either sends the request from <code>https://${shared.SITE}.attacker.com/</code> (which contains the allowed string) or strips the Referer entirely (e.g. from a <code>rel=noreferrer</code> navigation or an <code>https→http</code> downgrade). Header-based origin checks are a fragile add-on, not a substitute for an unguessable per-session token.`,
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
      const ref = req.headers.referer || req.headers.origin || '';
      const ok = ref === '' || ref.includes(shared.SITE);   //! substring match on Referer, and an empty Referer is allowed — both are trivial to spoof
      if (!ok)
        return res.send(shared.stagePage(ctx, { content: shared.accountCard(ctx, sess), result: shared.deniedBanner('⛔ Rejected — Referer does not name the site.') }));
      sess.email = req.body.email || sess.email;
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
