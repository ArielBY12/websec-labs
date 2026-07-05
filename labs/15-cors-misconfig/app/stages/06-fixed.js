'use strict';

// Stage 6 — the fix: an exact-string allowlist of known origins, nothing else.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 6,
  slug: 'fixed',
  title: 'Exact-string origin allowlist',
  defense: 'Allows only exact, known origins (no reflection, prefix, suffix, regex, or null).',
  hint: '',
  lesson: 'Compare the Origin for exact equality against a small allowlist of known origins; reflect only a matched origin, never a computed one.',
  explanation:
    "The Origin is checked for exact membership in a fixed allowlist, so reflection, prefix/suffix matches, unescaped-dot regexes, and the null origin are all rejected. The legitimate front-end still gets a valid <code>Access-Control-Allow-Origin</code>; every attacker origin gets none, so the browser blocks the read.",
  status: 'secure',

  createRouter(ctx) {
    const r = express.Router();
    const ALLOW = new Set(['https://bank.example', 'https://app.bank.example']);
    const corsPolicy = (origin) => ALLOW.has(origin) ? origin : null;   //! exact-string allowlist — only known origins are echoed back; everything else is denied

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.apiCard(ctx) })));
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
