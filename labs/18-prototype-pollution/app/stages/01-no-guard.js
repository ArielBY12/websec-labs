'use strict';

// Stage 1 — a recursive merge with no key guard at all.

const express = require('express');
const shared = require('../shared');

const GADGET = 'pp1';

module.exports = {
  stage: 1,
  slug: 'no-guard',
  title: 'Unguarded recursive merge',
  defense: 'None — the JSON is deep-merged as-is.',
  hint: "Your JSON is deep-merged into a settings object. The special key <code>__proto__</code> refers to <code>Object.prototype</code>, so merging into it pollutes every object. Send <code>{\"__proto__\":{\"pp1\":true}}</code>.",
  lesson: 'A recursive merge that follows the __proto__ key writes onto Object.prototype, affecting all objects.',
  explanation:
    "Merging into <code>__proto__</code> set a property on <code>Object.prototype</code>, so a brand-new <code>{}</code> inherited it. Guard merges against <code>__proto__</code>/<code>constructor</code>/<code>prototype</code>, or use null-prototype objects/Maps.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const merge = (t, p) => {
      for (const k of Object.keys(p)) {   //! recursive merge with no key guard — "__proto__" recurses into Object.prototype
        const v = p[k];
        if (v && typeof v === 'object' && !Array.isArray(v)) { if (t[k] == null) t[k] = {}; merge(t[k], v); }
        else t[k] = v;
      }
    };
    const run = (patch) => { merge({}, patch); return ({})[GADGET] !== undefined; };

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.mergeForm(ctx, '{"__proto__":{"pp1":true}}') })));
    r.post('/merge', (req, res) => {
      let patch; try { patch = JSON.parse(req.body.data || '{}'); } catch { return res.send(shared.stagePage(ctx, { content: shared.mergeForm(ctx, req.body.data), result: shared.deniedBanner('⛔ Invalid JSON.') })); }
      const isP = run(patch);
      res.send(shared.stagePage(ctx, { content: shared.mergeForm(ctx) + shared.probePanel(GADGET, isP), success: isP }));
    });
    return r;
  },
};
