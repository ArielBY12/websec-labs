'use strict';

// Stage 1 — a debug endpoint left enabled in production dumps the full config.

const express = require('express');
const shared = require('../shared');

const CONFIG = { env: 'production', version: '2.3.1', secret: shared.FLAG };

module.exports = {
  stage: 1,
  slug: 'debug-endpoint',
  title: 'Debug endpoint enabled',
  defense: 'A /debug endpoint (meant for development).',
  hint: "A diagnostics route was left switched on in production. Try <code>GET /debug</code> — it dumps the running configuration.",
  lesson: 'Debug/diagnostic endpoints must be disabled in production — they expose configuration and secrets.',
  explanation:
    "The <code>/debug</code> endpoint printed the whole config object, secret and all. Development conveniences (debug routes, verbose modes, sample data) must be turned off for production builds.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, {
      content: shared.infoCard('<p>Endpoints: <code>GET /debug</code> (diagnostics).</p>'),
    })));
    r.get('/debug', (req, res) => res.send(shared.stagePage(ctx, {   //! debug endpoint left enabled in production — it dumps the full config including secrets
      content: shared.outputPanel('GET /debug — running config', CONFIG), success: true,
    })));
    return r;
  },
};
