'use strict';

// Stage 3 — the initial host is validated, but redirects are followed.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 3,
  slug: 'follow-redirect',
  title: 'Validates host, follows redirects',
  defense: 'Blocks internal initial hosts; follows redirects.',
  hint: "The host you submit is checked against internal ranges now. But the fetcher follows redirects — host a public URL that 302-redirects inward. Try <code>http://redirect.evil/</code>.",
  lesson: 'Validating only the initial host misses redirects (and DNS rebinding) that land on internal targets.',
  explanation:
    "<code>redirect.evil</code> passed the check as a public host, then redirected the fetch to the internal metadata service. Re-validate the target after every redirect (or disable redirects) — the check must apply to the host actually connected to.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.fetchForm(ctx, 'http://redirect.evil/') })));
    r.post('/fetch', (req, res) => {
      const url = req.body.url || '';
      let host; try { host = new URL(url).hostname; } catch { return res.send(shared.stagePage(ctx, { content: shared.fetchForm(ctx, url), result: shared.deniedBanner('⛔ Invalid URL.') })); }
      if (shared.isInternalHost(host))
        return res.send(shared.stagePage(ctx, { content: shared.fetchForm(ctx, url), result: shared.deniedBanner('⛔ Internal host blocked.') }));
      const resp = shared.fakeFetch(url, true);   //! validates the initial host but then follows redirects to internal
      res.send(shared.stagePage(ctx, { content: shared.fetchForm(ctx, url) + shared.responsePanel(url, resp), success: shared.ssrfLeaked(resp.body) }));
    });
    return r;
  },
};
