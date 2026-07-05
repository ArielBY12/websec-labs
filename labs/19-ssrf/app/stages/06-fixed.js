'use strict';

// Stage 6 — the fix: parse with a real URL parser, allow only http(s), block every
// internal host by canonicalized resolution, and don't follow redirects inward.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 6,
  slug: 'fixed',
  title: 'Robust host validation, no redirects',
  defense: 'Real URL parse; http(s) only; blocks all internal via canonical IP; no redirect following.',
  hint: '',
  lesson: 'Parse the URL with a real library, allow only http(s), resolve and reject every internal/loopback/link-local address, and re-check after redirects (or disable them) — ideally allowlist destinations.',
  explanation:
    "The URL is parsed the same way the client parses it, restricted to http(s), and its canonicalized hostname is checked against all internal ranges — so decimal/short IPs, userinfo tricks, link-local, and redirects all fail. Public URLs still work.",
  status: 'secure',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.fetchForm(ctx) })));
    r.post('/fetch', (req, res) => {
      const url = req.body.url || '';
      let u; try { u = new URL(url); } catch { return res.send(shared.stagePage(ctx, { content: shared.fetchForm(ctx, url), result: shared.deniedBanner('⛔ Invalid URL.') })); }
      if (!/^https?:$/.test(u.protocol) || shared.isInternalHost(u.hostname))   //! parse robustly, allow only http(s), block every internal host via canonicalized resolution, and don't follow redirects
        return res.send(shared.stagePage(ctx, { content: shared.fetchForm(ctx, url), result: shared.deniedBanner('⛔ Destination not allowed.') }));
      const resp = shared.fakeFetch(url, false);
      res.send(shared.stagePage(ctx, { content: shared.fetchForm(ctx, url) + shared.responsePanel(url, resp) }));
    });
    return r;
  },
};
