'use strict';

// Stage 5 — an internal endpoint has no authentication; it relied on being firewalled.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 5,
  slug: 'missing-auth',
  title: 'Unauthenticated internal endpoint',
  defense: 'An /internal/config endpoint (assumed network-isolated).',
  hint: "There's an internal management endpoint the team assumed was unreachable from outside. It has no authentication of its own. Try <code>GET /internal/config</code>.",
  lesson: 'Never rely on network isolation alone — sensitive endpoints must authenticate; assume they’re reachable.',
  explanation:
    "The config endpoint had no auth because it was “only reachable internally” — but a misrouted proxy, SSRF, or flat network exposes it. Every sensitive endpoint must enforce authentication regardless of where it’s deployed.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, {
      content: shared.infoCard('<p>Management: <code>GET /internal/config</code>.</p>'),
    })));
    r.get('/internal/config', (req, res) => res.send(shared.stagePage(ctx, {   //! sensitive internal endpoint has no authentication — it relied on network isolation
      content: shared.outputPanel('GET /internal/config', { db: 'primary', secret: shared.FLAG }), success: true,
    })));
    return r;
  },
};
