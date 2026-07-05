'use strict';

// Stage 3 — the allowlist uses endsWith on the trusted domain.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 3,
  slug: 'endswith',
  title: 'endsWith allowlist',
  defense: 'Allows origins that end with the trusted domain.',
  hint: "Now it checks <code>origin.endsWith('bank.example')</code>. Register a domain that ends with it: <code>https://evilbank.example</code>.",
  lesson: 'An endsWith origin check is bypassed by prefixing the trusted domain with your own label.',
  explanation:
    "<code>https://evilbank.example</code> ends with <code>bank.example</code>, so it passed — but it's a different, attacker-owned domain. Suffix matching is as broken as prefix matching; compare full origins exactly.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const corsPolicy = (origin) => origin.endsWith('bank.example') ? origin : null;   //! endsWith allows https://evilbank.example

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.apiCard(ctx, 'https://evilbank.example') })));
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
