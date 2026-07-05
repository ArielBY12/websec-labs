'use strict';

// Stage 5 — the resolved IP is checked against a blocklist of private ranges that
// misses link-local.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 5,
  slug: 'incomplete-blocklist',
  title: 'Incomplete private-range blocklist',
  defense: 'Blocks 127./10./192.168./172.16. ranges.',
  hint: "It resolves the host and blocks the common private ranges — but not everything internal is RFC 1918. The cloud metadata service lives on link-local <code>169.254.169.254</code>, which isn't on the list.",
  lesson: 'A blocklist of internal ranges must include link-local (169.254/16), IPv6, 0.0.0.0, and more — allowlisting is safer.',
  explanation:
    "<code>169.254.169.254</code> (link-local, the cloud metadata address) wasn't in the blocklist, so it was fetched. Enumerating every internal range is error-prone; prefer an allowlist of permitted destinations.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.fetchForm(ctx, 'http://169.254.169.254/latest/meta-data/') })));
    r.post('/fetch', (req, res) => {
      const url = req.body.url || '';
      let host; try { host = new URL(url).hostname; } catch { return res.send(shared.stagePage(ctx, { content: shared.fetchForm(ctx, url), result: shared.deniedBanner('⛔ Invalid URL.') })); }
      const ip = shared.canonicalIp(host) || host;
      const BLOCKED = ['127.', '10.', '192.168.', '172.16.'];
      if (BLOCKED.some((p) => ip.startsWith(p)))   //! blocklist of private ranges misses link-local 169.254.0.0/16
        return res.send(shared.stagePage(ctx, { content: shared.fetchForm(ctx, url), result: shared.deniedBanner('⛔ Private address blocked.') }));
      const resp = shared.fakeFetch(url);
      res.send(shared.stagePage(ctx, { content: shared.fetchForm(ctx, url) + shared.responsePanel(url, resp), success: shared.ssrfLeaked(resp.body) }));
    });
    return r;
  },
};
