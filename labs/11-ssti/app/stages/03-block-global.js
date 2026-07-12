'use strict';

// Stage 3 — the word "global" is blacklisted.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 3,
  slug: 'block-global',
  title: 'Keyword blacklist: global',
  defense: 'Rejects templates mentioning "global" or "require".',
  hint: "You can't name <code>global</code> now — but the engine evaluates each expression as a non-strict function, so <code>this</code> is the global object. Try <code>{{ this.__SSTI_FLAG__ }}</code>.",
  lesson: 'The runtime is reachable by many names — blacklisting one identifier (global) misses this, globalThis, and the constructor chain.',
  explanation:
    "Blocking <code>global</code> ignored that a non-strict function's <code>this</code> is the global object, so <code>this.__SSTI_FLAG__</code> read the secret. There are too many paths to the runtime to deny by name.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.templateForm(ctx) })));
    r.post('/render', (req, res) => {
      const tpl = req.body.template || '';
      if (/global|require/i.test(tpl))   //! blacklists "global"/"require" — the runtime is still reachable via this / the constructor chain
        return res.send(shared.stagePage(ctx, { content: shared.templateForm(ctx, tpl), result: shared.deniedBanner('⛔ Blocked keyword.') }));
      const out = String(tpl).replace(/{{(.+?)}}/g, (_, e) => {
        try { return String(shared.evalExpr(e, {})); } catch { return '∅'; }
      });
      res.send(shared.stagePage(ctx, { content: shared.templateForm(ctx, tpl) + shared.outputPanel(out), success: shared.looksSSTI(out) }));
    });
    return r;
  },
};
