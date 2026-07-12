'use strict';

// Stage 4 — a bigger word blacklist (global, globalThis, this, process).

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 4,
  slug: 'block-this',
  title: 'Bigger keyword blacklist',
  defense: 'Rejects global / globalThis / this / process / function / require.',
  hint: "The obvious runtime names are gone. Reach the engine through any object's constructor chain: <code>''.constructor.constructor</code> is <code>Function</code>, which runs in global scope — where the secret is a bare identifier. Try <code>{{ ''.constructor.constructor('return __SSTI_FLAG__')() }}</code>.",
  lesson: 'The constructor chain (obj → constructor → Function) reaches global scope, defeating any globals name blacklist.',
  explanation:
    "<code>''.constructor.constructor</code> is the <code>Function</code> constructor; a function it builds runs in global scope, where <code>__SSTI_FLAG__</code> resolves as a bare global. No blocked word appears in the payload. Denylists can't cover the constructor chain.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.templateForm(ctx) })));
    r.post('/render', (req, res) => {
      const tpl = req.body.template || '';
      if (/global|globalThis|this|process|function|require/i.test(tpl))   //! a longer word blacklist — still bypassable via the constructor chain, which never spells "Function"
        return res.send(shared.stagePage(ctx, { content: shared.templateForm(ctx, tpl), result: shared.deniedBanner('⛔ Blocked keyword.') }));
      const out = String(tpl).replace(/{{(.+?)}}/g, (_, e) => {
        try { return String(shared.evalExpr(e, {})); } catch { return '∅'; }
      });
      res.send(shared.stagePage(ctx, { content: shared.templateForm(ctx, tpl) + shared.outputPanel(out), success: shared.looksSSTI(out) }));
    });
    return r;
  },
};
