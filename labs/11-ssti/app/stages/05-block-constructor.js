'use strict';

// Stage 5 — "constructor" is added to the blacklist too.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 5,
  slug: 'block-constructor',
  title: 'Blacklist: constructor',
  defense: 'Also rejects the word "constructor".',
  hint: "The word <code>constructor</code> is blocked, so build the property name from pieces — JavaScript looks up properties by the computed string: <code>{{ ''['con'+'structor']['con'+'structor']('return __SSTI_FLAG__')() }}</code>.",
  lesson: 'Substring keyword filters fall to string construction — a property name assembled at runtime never contains the banned word.',
  explanation:
    "<code>obj['con'+'structor']</code> is identical to <code>obj.constructor</code>, but the literal <code>constructor</code> never appears in the source, so the blacklist doesn't see it. Filtering the text of code can't stop code from building the strings it needs.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.templateForm(ctx) })));
    r.post('/render', (req, res) => {
      const tpl = req.body.template || '';
      if (/global|globalThis|this|process|function|constructor|require/i.test(tpl))   //! adds "constructor" to the blacklist — defeated by assembling the property name from concatenated pieces
        return res.send(shared.stagePage(ctx, { content: shared.templateForm(ctx, tpl), result: shared.deniedBanner('⛔ Blocked keyword.') }));
      const out = String(tpl).replace(/{{(.+?)}}/g, (_, e) => {
        try { return String(shared.evalExpr(e, {})); } catch { return '∅'; }
      });
      res.send(shared.stagePage(ctx, { content: shared.templateForm(ctx, tpl) + shared.outputPanel(out), success: shared.looksSSTI(out) }));
    });
    return r;
  },
};
