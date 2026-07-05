'use strict';

// Stage 4 — dangerous keys are sanitized by removing the "__proto__" substring, once.

const express = require('express');
const shared = require('../shared');

const GADGET = 'pp4';

module.exports = {
  stage: 4,
  slug: 'strip-substring',
  title: 'Non-recursive key sanitize',
  defense: 'Removes "__proto__" from each key before merging.',
  hint: "It strips <code>__proto__</code> out of every key — but once, without re-scanning. Nest it so removal re-forms it: <code>{\"__pro__proto__to__\":{\"pp4\":true}}</code>.",
  lesson: 'A single-pass substring strip re-creates the key it removed (__pro__proto__to__ → __proto__).',
  explanation:
    "Deleting <code>__proto__</code> from <code>__pro__proto__to__</code> leaves <code>__proto__</code> behind, which the merge then used. Don't sanitize by stripping; reject dangerous keys by exact match (and don't recurse into them).",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const merge = (t, p) => {
      for (const k0 of Object.keys(p)) {
        const k = String(k0).replace('__proto__', '');   //! strips "__proto__" once — "__pro__proto__to__" collapses back into "__proto__"
        const v = p[k0];
        if (v && typeof v === 'object' && !Array.isArray(v)) { if (t[k] == null) t[k] = {}; merge(t[k], v); }
        else t[k] = v;
      }
    };
    const run = (patch) => { merge({}, patch); return ({})[GADGET] !== undefined; };

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.mergeForm(ctx, '{"__pro__proto__to__":{"pp4":true}}') })));
    r.post('/merge', (req, res) => {
      let patch; try { patch = JSON.parse(req.body.data || '{}'); } catch { return res.send(shared.stagePage(ctx, { content: shared.mergeForm(ctx, req.body.data), result: shared.deniedBanner('⛔ Invalid JSON.') })); }
      const isP = run(patch);
      res.send(shared.stagePage(ctx, { content: shared.mergeForm(ctx) + shared.probePanel(GADGET, isP), success: isP }));
    });
    return r;
  },
};
