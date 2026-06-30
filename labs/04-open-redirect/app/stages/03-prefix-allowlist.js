'use strict';

// Stage 3 — only allows URLs that start with the site's own base URL.

const express = require('express');
const shared = require('../shared');

const SITE = `https://${shared.SITE_HOST}`; // our base URL, e.g. https://websec-labs.local

module.exports = {
  stage: 3,
  slug: 'prefix-allowlist',
  title: 'Must start with our site URL',
  defense: 'URL must start with the site\'s base URL.',
  hint: "Now the URL must begin with <code>https://websec-labs.local</code>. A string <em>prefix</em> check, though — what host does <code>https://websec-labs.local.evil.example/</code> actually point to? Who can register that domain?",
  lesson: 'Prefix/substring host checks are bypassable — the attacker just makes your trusted string a prefix of their own domain.',
  explanation:
    "<code>startsWith(\"https://websec-labs.local\")</code> is a text check, not a URL check. <code>https://websec-labs.local.evil.example/</code> starts with that exact text, but its real host is <code>websec-labs.local.evil.example</code> — a domain the attacker owns. " +
    "To compare hosts you must parse the URL and check the host <em>exactly</em>, not match a prefix.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.urlForm(ctx.mount) })));

    r.get('/go', (req, res) => {
      let target = req.query.url || '/';
      if (!target.startsWith(SITE)) target = '/';   //! prefix check: "https://websec-labs.local.evil.example" also starts with the trusted base URL
      const offsite = shared.isOffsite(target);
      res.send(shared.stagePage(ctx, { result: shared.redirectView(target, offsite), success: offsite }));
    });

    return r;
  },
};
