'use strict';

// Stage 4 — the fix: don't try to validate arbitrary external URLs at all. Only
// allow same-site RELATIVE paths that we control — a single leading "/" that is
// not "//" (protocol-relative) or "/\" (which some browsers treat as "//").
// Anything else falls back to the home page.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 5,
  slug: 'fixed',
  title: 'Same-site relative paths only',
  defense: 'Only same-site relative paths are allowed; anything else → /.',
  hint: '',
  lesson: 'Restrict redirects to same-site relative paths (or an allowlist of exact hosts); never reflect an attacker-controlled absolute URL.',
  explanation:
    "Instead of blacklisting bad URLs, the destination must be a relative path on this site: one leading <code>/</code> followed by a normal character — never <code>//</code> or <code>/\\</code> (which browsers read as protocol-relative). " +
    "Every absolute, protocol-relative, and look-alike-host payload fails this test and falls back to <code>/</code>, while a genuine path like <code>/account</code> still works.",
  status: 'secure',

  createRouter(ctx) {
    const r = express.Router();

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.urlForm(ctx.mount) })));

    r.get('/go', (req, res) => {
      const raw = req.query.url || '/';
      const target = /^\/[^/\\]/.test(raw) ? raw : '/';   //! same-site only: must be a relative path ("/x"), never "//host" or "/\\host"
      const offsite = shared.isOffsite(target);
      res.send(shared.stagePage(ctx, { result: shared.redirectView(target, offsite), success: offsite }));
    });

    return r;
  },
};
