'use strict';

// Stage 1 — the API reflects any Origin and allows credentials.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 1,
  slug: 'reflect-any',
  title: 'Reflects any Origin',
  defense: 'Echoes the request Origin into Access-Control-Allow-Origin.',
  hint: "The API copies whatever <code>Origin</code> you send into <code>Access-Control-Allow-Origin</code> and also sets <code>Allow-Credentials: true</code>. Any site — including <code>https://evil.attacker.com</code> — can read your account.",
  lesson: 'Reflecting the Origin with credentials lets every website read authenticated responses.',
  explanation:
    "Echoing the request Origin makes <code>Access-Control-Allow-Origin</code> equal to the attacker's site, and with <code>Allow-Credentials: true</code> the victim's cookies are sent and the response is readable cross-origin. Allowlist specific origins instead.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const corsPolicy = (origin) => origin || null;   //! reflects any Origin back as allowed (with credentials) — every site can read the response

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
