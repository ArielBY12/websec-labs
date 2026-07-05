'use strict';

// Stage 2 — the URL is rejected if it contains "localhost" or "127.0.0.1".

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 2,
  slug: 'string-blacklist',
  title: 'Hostname string blacklist',
  defense: 'Rejects URLs containing localhost / 127.0.0.1.',
  hint: "It blocks the obvious spellings — but <code>127.0.0.1</code> has many forms. Try the 32-bit decimal <code>http://2130706433/</code>, the short form <code>http://127.1/</code>, or <code>http://0.0.0.0/</code>.",
  lesson: 'IPs have countless encodings (decimal, octal, short, IPv6) — a string blacklist can’t enumerate them.',
  explanation:
    "<code>2130706433</code> and <code>127.1</code> both resolve to <code>127.0.0.1</code> but don't contain the blacklisted strings. Match on the resolved IP, not the textual URL.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.fetchForm(ctx, 'http://2130706433/') })));
    r.post('/fetch', (req, res) => {
      const url = req.body.url || '';
      if (/localhost|127\.0\.0\.1/i.test(url))   //! string blacklist — alternate IP encodings (decimal 2130706433, 127.1) bypass it
        return res.send(shared.stagePage(ctx, { content: shared.fetchForm(ctx, url), result: shared.deniedBanner('⛔ Local addresses are not allowed.') }));
      const resp = shared.fakeFetch(url);
      res.send(shared.stagePage(ctx, { content: shared.fetchForm(ctx, url) + shared.responsePanel(url, resp), success: shared.ssrfLeaked(resp.body) }));
    });
    return r;
  },
};
