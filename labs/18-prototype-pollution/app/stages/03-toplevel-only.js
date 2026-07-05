'use strict';

// Stage 3 — dangerous keys are blocked, but only at the top level of the patch.

const express = require('express');
const shared = require('../shared');

const GADGET = 'pp3';

module.exports = {
  stage: 3,
  slug: 'toplevel-only',
  title: 'Top-level key check only',
  defense: 'Rejects __proto__/constructor at the top level.',
  hint: "Top-level <code>__proto__</code> and <code>constructor</code> are blocked, but the merge recurses and the check doesn't. Nest it one level down: <code>{\"x\":{\"__proto__\":{\"pp3\":true}}}</code>.",
  lesson: 'A key check that runs only at the top level is bypassed by nesting the dangerous key deeper.',
  explanation:
    "The guard only inspected the outer keys, so <code>x.__proto__</code> — reached by the recursion — still polluted the prototype. The dangerous-key check must run at every level of the merge.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const merge = (t, p, depth = 0) => {
      for (const k of Object.keys(p)) {
        if (depth === 0 && (k === '__proto__' || k === 'constructor')) continue;   //! only top-level keys are checked — a nested __proto__ still pollutes
        const v = p[k];
        if (v && typeof v === 'object' && !Array.isArray(v)) { if (t[k] == null) t[k] = {}; merge(t[k], v, depth + 1); }
        else t[k] = v;
      }
    };
    const run = (patch) => { merge({}, patch); return ({})[GADGET] !== undefined; };

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.mergeForm(ctx, '{"x":{"__proto__":{"pp3":true}}}') })));
    r.post('/merge', (req, res) => {
      let patch; try { patch = JSON.parse(req.body.data || '{}'); } catch { return res.send(shared.stagePage(ctx, { content: shared.mergeForm(ctx, req.body.data), result: shared.deniedBanner('⛔ Invalid JSON.') })); }
      const isP = run(patch);
      res.send(shared.stagePage(ctx, { content: shared.mergeForm(ctx) + shared.probePanel(GADGET, isP), success: isP }));
    });
    return r;
  },
};
