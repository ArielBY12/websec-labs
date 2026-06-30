'use strict';

// Stage 1 — the "return to" link redirects to the URL in ?url=.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 1,
  slug: 'naive',
  title: 'Redirect to any URL',
  defense: 'None — redirects wherever you say.',
  hint: "The link is meant for a path on this site, e.g. <code>?url=/account</code>. But nothing stops you passing a full URL to somewhere else entirely — try <code>?url=https://evil.example/login</code>.",
  lesson: 'Redirecting to a raw user-supplied URL lets an attacker send victims anywhere.',
  explanation:
    "The destination came straight from <code>?url=</code> with no check, so a link on this trusted site happily forwarded you to an external host. " +
    "An attacker emails <code>https://this-site/go?url=https://evil.example/login</code> — it looks legit, but lands the victim on a phishing page.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.urlForm(ctx.mount) })));

    r.get('/go', (req, res) => {
      const target = req.query.url || '/';   //! redirects to whatever URL the user supplies — no validation
      const offsite = shared.isOffsite(target);
      res.send(shared.stagePage(ctx, { result: shared.redirectView(target, offsite), success: offsite }));
    });

    return r;
  },
};
