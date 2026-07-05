'use strict';

// Stage 1 — the user-supplied template is compiled and evaluated as code.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 1,
  slug: 'raw',
  title: 'Template compiled from user input',
  defense: 'None — the template is evaluated as-is.',
  hint: "Your template is compiled on the server, so <code>{{ }}</code> holds a real expression. Prove it with <code>{{ 7*7 }}</code>, then read the secret: <code>{{ global.__SSTI_FLAG__ }}</code>.",
  lesson: 'Compiling untrusted input as a template is code execution — expressions run with the server’s privileges.',
  explanation:
    "The <code>{{ … }}</code> body was evaluated as a JavaScript expression, so it could read anything the process can — including the server secret. Never compile user input as a template; pass it as bound data instead.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.templateForm(ctx) })));
    r.post('/render', (req, res) => {
      const tpl = req.body.template || '';
      const out = String(tpl).replace(/{{(.+?)}}/g, (_, e) => {   //! the user's template is compiled and evaluated as code — server-side template injection
        try { return String(shared.evalExpr(e, {})); } catch { return '∅'; }
      });
      res.send(shared.stagePage(ctx, { content: shared.templateForm(ctx, tpl) + shared.outputPanel(out), success: shared.looksSSTI(out) }));
    });
    return r;
  },
};
