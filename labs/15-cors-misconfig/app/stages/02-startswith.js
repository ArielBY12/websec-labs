'use strict';

// Stage 2 — the allowlist uses startsWith on the trusted origin.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 2,
  slug: 'startswith',
  title: 'startsWith allowlist',
  defense: 'Allows origins that start with the trusted origin.',
  hint: "It checks <code>origin.startsWith('https://bank.example')</code>. Register the trusted origin as a prefix of yours: <code>https://bank.example.evil.com</code> starts with it.",
  lesson: 'A startsWith origin check is bypassed by appending your domain as a subdomain suffix.',
  explanation:
    "<code>https://bank.example.evil.com</code> starts with the trusted string, so it was allowed — yet it's an attacker domain. Origin checks must be exact-string equality against an allowlist, not prefix/suffix matching.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const corsPolicy = (origin) => origin.startsWith(shared.TRUSTED) ? origin : null;   //! startsWith allows https://bank.example.evil.com

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.apiCard(ctx, 'https://bank.example.evil.com') })));
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
