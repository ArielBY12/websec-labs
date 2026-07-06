'use strict';

// Stage 5 — a different defense: instead of a token, gate the request on the
// Referer header naming the site.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 5,
  slug: 'referer-check',
  title: 'Referer-based defense',
  defense: 'Accepts the request only if the Referer is same-site.',
  hint: "No token this time — the server checks that the <code>Referer</code> header's host matches its own. Deliver <strong>cross-site (evil.example)</strong> first and watch it get <strong>rejected</strong> — that Referer isn't same-site. But the check has a hole: it also lets the request through when there's <em>no</em> Referer at all. Switch the delivery origin to <strong>🚫 No Referer (stripped)</strong> and deliver a <strong>POST</strong> — the absent Referer sails through.",
  lesson: 'A Referer/Origin check is a fragile add-on — an absent Referer (privacy modes, downgrades, no-referrer) sails through; prefer an unguessable per-session token and SameSite cookies.',
  explanation:
    "The check trusted the Referer host but allowed requests that carried <em>no</em> Referer — and a cross-site payload can simply omit it (<code>&lt;meta name=referrer content=no-referrer&gt;</code>, a <code>rel=noreferrer</code> link, or an HTTPS→HTTP downgrade). Header-based origin checks are easily sidestepped and are no substitute for a per-session token.",
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
      const ref = shared.effectiveReferer(req);
      let ok;
      try { ok = !ref || new URL(ref).host === req.headers.host; } catch { ok = false; }   //! checks the Referer host but ALLOWS an absent Referer — a cross-site request that omits it passes
      if (!ok)
        return res.send(shared.stagePage(ctx, { content: shared.accountView(ctx, sess, VIEW), result: shared.deniedBanner('⛔ Rejected — cross-site Referer.') }));
      sess.email = req.body.email || sess.email;
      res.send(shared.stagePage(ctx, shared.afterChange(ctx, sess, req, VIEW)));
    });

    return r;
  },
};
