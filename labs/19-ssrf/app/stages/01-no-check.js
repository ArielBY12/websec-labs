'use strict';

// Stage 1 — the server fetches any URL you give it, with no validation.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 1,
  slug: 'no-check',
  title: 'No URL validation',
  defense: 'None — any URL is fetched.',
  hint: "The server fetches whatever URL you supply from its own network. Point it at the cloud metadata service: <code>http://169.254.169.254/</code> (or <code>http://localhost/</code>).",
  lesson: 'Fetching a user-supplied URL server-side reaches internal hosts the user could never reach directly.',
  explanation:
    "Your URL was fetched from the server, which sits inside the trusted network, so it reached the internal metadata service. Validate the destination against an allowlist and block internal ranges.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.fetchForm(ctx) })));
    r.post('/fetch', (req, res) => {
      const url = req.body.url || '';
      const resp = shared.fakeFetch(url);   //! fetches any URL with no validation — internal hosts are reachable from the server
      res.send(shared.stagePage(ctx, { content: shared.fetchForm(ctx, url) + shared.responsePanel(url, resp), success: shared.ssrfLeaked(resp.body) }));
    });
    return r;
  },
};
