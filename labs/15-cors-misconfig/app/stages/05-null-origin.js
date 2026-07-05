'use strict';

// Stage 5 — the allowlist is exact, but it also trusts the "null" origin.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 5,
  slug: 'null-origin',
  title: 'Trusts the null origin',
  defense: 'Exact allowlist that also includes the "null" origin.',
  hint: "The allowlist is exact now, but it also permits <code>Origin: null</code> (added so local files could call the API). A sandboxed iframe or a redirect makes the browser send <code>Origin: null</code>. Test origin <code>null</code>.",
  lesson: 'The "null" origin is forgeable (sandboxed iframes, redirects, data: URLs) — never allowlist it.',
  explanation:
    "<code>null</code> isn't a safe identity: any page can obtain it via a sandboxed iframe or a cross-site redirect, so allowlisting it hands access to everyone. Remove <code>null</code> from the allowlist entirely.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const ALLOW = new Set([shared.TRUSTED, 'null']);
    const corsPolicy = (origin) => ALLOW.has(origin) ? origin : null;   //! trusts the "null" origin — a sandboxed iframe or redirect makes the browser send Origin: null

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.apiCard(ctx, 'null') })));
    r.get('/api/account', (req, res) => {
      const acao = corsPolicy(req.get('origin') || '');
      if (acao) { res.setHeader('Access-Control-Allow-Origin', acao); res.setHeader('Access-Control-Allow-Credentials', 'true'); }
      res.json({ user: 'alice', secret: shared.SECRET });
    });
    r.get('/check', (req, res) => {
      const origin = req.query.origin || '';
      const acao = corsPolicy(origin);
      const success = shared.crossOriginReadable(origin, acao) && origin !== shared.TRUSTED;
      res.send(shared.stagePage(ctx, { content: shared.apiCard(ctx, origin) + shared.decisionPanel(origin, acao), success }));
    });
    return r;
  },
};
