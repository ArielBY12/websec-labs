'use strict';

// Stage 2 — the merge skips the "__proto__" key, but not the constructor.prototype path.

const express = require('express');
const shared = require('../shared');

const GADGET = 'pp2';

module.exports = {
  stage: 2,
  slug: 'block-proto',
  title: 'Blocks __proto__ only',
  defense: 'Skips the "__proto__" key while merging.',
  hint: "<code>__proto__</code> is skipped now — but there's another route to the prototype: <code>constructor.prototype</code>. Send <code>{\"constructor\":{\"prototype\":{\"pp2\":true}}}</code>.",
  lesson: 'Blocking __proto__ misses the constructor.prototype path, which reaches the same Object.prototype.',
  explanation:
    "<code>obj.constructor.prototype</code> is <code>Object.prototype</code>, so merging through it polluted the prototype without ever using <code>__proto__</code>. All three of <code>__proto__</code>, <code>constructor</code>, and <code>prototype</code> must be blocked.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const merge = (t, p) => {
      for (const k of Object.keys(p)) {
        if (k === '__proto__') continue;   //! blocks the "__proto__" key but not the constructor.prototype path to Object.prototype
        const v = p[k];
        if (v && typeof v === 'object' && !Array.isArray(v)) { if (t[k] == null) t[k] = {}; merge(t[k], v); }
        else t[k] = v;
      }
    };
    const run = (patch) => { merge({}, patch); return ({})[GADGET] !== undefined; };

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.mergeForm(ctx, '{"constructor":{"prototype":{"pp2":true}}}') })));
    r.post('/merge', (req, res) => {
      let patch; try { patch = JSON.parse(req.body.data || '{}'); } catch { return res.send(shared.stagePage(ctx, { content: shared.mergeForm(ctx, req.body.data), result: shared.deniedBanner('⛔ Invalid JSON.') })); }
      const isP = run(patch);
      res.send(shared.stagePage(ctx, { content: shared.mergeForm(ctx) + shared.probePanel(GADGET, isP), success: isP }));
    });
    return r;
  },
};
