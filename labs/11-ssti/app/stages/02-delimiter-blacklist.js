'use strict';

// Stage 2 — the {{ }} delimiter is blocked, but the engine also evaluates {% %}.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 2,
  slug: 'delimiter-blacklist',
  title: 'Delimiter blacklist',
  defense: 'Rejects templates containing {{ or }}.',
  hint: "The <code>{{ }}</code> delimiter is banned, but the same engine also evaluates <code>{% … %}</code>. Try <code>{% global.__SSTI_FLAG__ %}</code>.",
  lesson: 'Blocking one delimiter syntax doesn’t disable the evaluation feature behind it.',
  explanation:
    "Only the <code>{{ }}</code> spelling was blocked; the engine still executed the <code>{% %}</code> form. The vulnerability is compiling input at all, not the particular braces used to mark it.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.templateForm(ctx, 'Hello {% user %}') })));
    r.post('/render', (req, res) => {
      const tpl = req.body.template || '';
      if (/{{|}}/.test(tpl))   //! blocks only the {{ }} delimiter — the engine still evaluates the {% %} delimiter
        return res.send(shared.stagePage(ctx, { content: shared.templateForm(ctx, tpl), result: shared.deniedBanner('⛔ {{ }} is not allowed.') }));
      const out = String(tpl).replace(/{%(.+?)%}/g, (_, e) => {
        try { return String(shared.evalExpr(e, {})); } catch { return '∅'; }
      });
      res.send(shared.stagePage(ctx, { content: shared.templateForm(ctx, tpl) + shared.outputPanel(out), success: shared.looksSSTI(out) }));
    });
    return r;
  },
};
