'use strict';

// Stage 6 — the fix: reject the dangerous keys by exact match at every level, and
// never recurse into them.

const express = require('express');
const shared = require('../shared');

const GADGET = 'ppF';
const BAD = new Set(['__proto__', 'constructor', 'prototype']);

module.exports = {
  stage: 6,
  slug: 'fixed',
  title: 'Reject dangerous keys everywhere',
  defense: 'Skips __proto__/constructor/prototype by exact match at every level.',
  hint: '',
  lesson: 'Reject __proto__/constructor/prototype by exact match at every depth (don’t strip), or merge into a null-prototype object / Map.',
  explanation:
    "Every key is checked for exact membership in the dangerous set at every level, and those keys are skipped entirely — so direct, nested, constructor.prototype, and reconstitution payloads all fail, and there's no dotted-path sink. A normal preferences merge still works. Using <code>Object.create(null)</code> or a <code>Map</code> is an even stronger option.",
  status: 'secure',

  createRouter(ctx) {
    const r = express.Router();
    const merge = (t, p) => {
      for (const k of Object.keys(p)) {
        if (BAD.has(k)) continue;   //! reject dangerous keys by exact match at every level and never recurse into them
        const v = p[k];
        if (v && typeof v === 'object' && !Array.isArray(v)) { if (t[k] == null) t[k] = {}; merge(t[k], v); }
        else t[k] = v;
      }
    };
    const run = (patch) => { merge({}, patch); return ({})[GADGET] !== undefined; };

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.mergeForm(ctx) })));
    r.post('/merge', (req, res) => {
      let patch; try { patch = JSON.parse(req.body.data || '{}'); } catch { return res.send(shared.stagePage(ctx, { content: shared.mergeForm(ctx, req.body.data), result: shared.deniedBanner('⛔ Invalid JSON.') })); }
      const isP = run(patch);
      res.send(shared.stagePage(ctx, { content: shared.mergeForm(ctx) + shared.probePanel(GADGET, isP), success: isP }));
    });
    return r;
  },
};
