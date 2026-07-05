'use strict';

// Stage 6 — the fix: plain JSON.parse (no reviver) + a strict schema allowlist.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 6,
  slug: 'fixed',
  title: 'Plain JSON + schema validation',
  defense: 'JSON.parse with no reviver; keeps only allowlisted primitive fields.',
  hint: '',
  lesson: 'Deserialize untrusted data as plain data (JSON.parse, no reviver), then validate against a strict schema — never revive functions or custom types.',
  explanation:
    "Parsing with no reviver means markers and <code>__type</code> tags are inert strings/objects, and the schema keeps only known primitive fields — so function eval, escaped markers, IIFE-during-parse, forged signatures, and type gadgets all fail. Legitimate preferences still load.",
  status: 'secure',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.tokenForm(ctx) })));
    r.post('/restore', (req, res) => {
      const token = req.body.token || '{}';
      let raw;
      try { raw = JSON.parse(token); }   //! plain JSON.parse with NO reviver, then keep only allowlisted primitive fields — nothing is ever evaluated
      catch (e) { return res.send(shared.stagePage(ctx, { content: shared.tokenForm(ctx, token), result: shared.deniedBanner('⛔ Invalid JSON.') })); }
      const clean = {};
      for (const k of ['theme', 'name', 'lang']) if (typeof raw?.[k] === 'string') clean[k] = raw[k];
      res.send(shared.stagePage(ctx, { content: shared.tokenForm(ctx, token) + shared.resultPanel(clean) }));
    });
    return r;
  },
};
