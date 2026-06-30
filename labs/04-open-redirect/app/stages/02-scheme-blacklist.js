'use strict';

// Stage 2 — rejects destinations that start with http:// or https://.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 2,
  slug: 'scheme-blacklist',
  title: 'Block http(s):// schemes',
  defense: 'Rejects URLs starting with http:// or https://.',
  hint: "Absolute <code>http(s)://</code> URLs are now bounced to <code>/</code>. But how does a browser treat a URL that starts with <code>//</code> (no scheme)? A <em>protocol-relative</em> URL like <code>//evil.example</code> still goes off-site.",
  lesson: 'Blocking the scheme is not enough — protocol-relative URLs (//host) leave the site without ever writing "http".',
  explanation:
    "The filter only rejected URLs beginning with <code>http://</code> / <code>https://</code>. A <em>protocol-relative</em> URL <code>//evil.example</code> has no scheme, so it slipped past — but the browser reads <code>//host</code> as “go to that host using the current scheme,” sending the victim off-site all the same.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.urlForm(ctx.mount) })));

    r.get('/go', (req, res) => {
      let target = req.query.url || '/';
      if (/^https?:\/\//i.test(target)) target = '/';   //! blocks http(s):// — but not protocol-relative "//host"
      const offsite = shared.isOffsite(target);
      res.send(shared.stagePage(ctx, { result: shared.redirectView(target, offsite), success: offsite }));
    });

    return r;
  },
};
