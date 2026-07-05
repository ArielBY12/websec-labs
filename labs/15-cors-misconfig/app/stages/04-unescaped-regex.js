'use strict';

// Stage 4 — the allowlist uses a regex with an unescaped dot.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 4,
  slug: 'unescaped-regex',
  title: 'Unescaped-dot regex',
  defense: 'Matches the origin against /^https:\\/\\/bank.example$/.',
  hint: "The regex looks anchored and exact — but the <code>.</code> in <code>bank.example</code> isn't escaped, so it matches any character. Register <code>https://bankxexample</code> (the dot position is any char).",
  lesson: 'An unescaped dot in an origin regex matches any character, widening the allowlist.',
  explanation:
    "In a regex, <code>.</code> means “any character”, so <code>/^https:\\/\\/bank.example$/</code> also matched <code>https://bankxexample</code>. Escape metacharacters (<code>\\.</code>) — or better, don't regex-match origins at all; use exact strings.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const corsPolicy = (origin) => /^https:\/\/bank.example$/.test(origin) ? origin : null;   //! the unescaped dot matches any char — https://bankxexample passes

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.apiCard(ctx, 'https://bankxexample') })));
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
