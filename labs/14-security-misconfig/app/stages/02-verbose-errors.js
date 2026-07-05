'use strict';

// Stage 2 — the error handler is verbose and returns internal config on failure.

const express = require('express');
const shared = require('../shared');

const CONFIG = { env: 'production', secret: shared.FLAG };

module.exports = {
  stage: 2,
  slug: 'verbose-errors',
  title: 'Verbose error responses',
  defense: 'A JSON API at /parse with detailed error output.',
  hint: "The <code>POST /parse</code> API parses JSON you send. Make it fail — send invalid JSON like <code>{ bad</code> — and read what the error handler returns.",
  lesson: 'Verbose errors (stack traces, config dumps) leak internals; return a generic message and log details server-side.',
  explanation:
    "When parsing failed, the handler helpfully returned the internal config alongside the error, exposing the secret. Production error responses must be generic; the details belong only in server logs.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, {
      content: shared.infoCard('<p>Endpoints: <code>POST /parse</code> {json}.</p>'),
    })));
    r.post('/parse', (req, res) => {
      try {
        const parsed = JSON.parse(req.body.data || '');
        res.send(shared.stagePage(ctx, { content: shared.outputPanel('Parsed OK', parsed) }));
      } catch (e) {
        res.send(shared.stagePage(ctx, {   //! verbose error handler returns the internal config (with secrets) on failure
          content: shared.outputPanel('Parse error (debug)', { message: e.message, config: CONFIG }), success: true,
        }));
      }
    });
    return r;
  },
};
