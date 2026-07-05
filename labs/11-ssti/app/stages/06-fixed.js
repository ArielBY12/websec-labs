'use strict';

// Stage 6 — the fix: the template is fixed server-side and the user input is bound as
// DATA, output-encoded, never compiled.

const express = require('express');
const shared = require('../shared');

const TEMPLATE = 'Hello {{ user }}';   // author-controlled, never from the request

module.exports = {
  stage: 6,
  slug: 'fixed',
  title: 'Input as data, not template',
  defense: 'Fixed server-side template; user input is bound as escaped data.',
  hint: '',
  lesson: 'Never compile untrusted input as a template — keep templates static and pass user input as bound, output-encoded data.',
  explanation:
    "The template is a constant the developer wrote; the request only supplies the <em>value</em> of <code>user</code>, which is interpolated as text and HTML-encoded. <code>{{ 7*7 }}</code> or a constructor payload is displayed literally, never evaluated — so none of the earlier escapes reach code. Separate code from data.",
  status: 'secure',

  createRouter(ctx) {
    const r = express.Router();
    const renderData = (data) =>
      TEMPLATE.replace(/{{(.+?)}}/g, (_, key) => shared.escapeHtml(String(data[key.trim()] ?? '')));   //! the template is a server-side constant; user input is bound as data and output-encoded, never compiled

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.templateForm(ctx, 'World') })));
    r.post('/render', (req, res) => {
      const user = req.body.template || '';       // treated as the *value* of `user`, not a template
      const out = renderData({ user });
      res.send(shared.stagePage(ctx, { content: shared.templateForm(ctx, user) + shared.outputPanel(out) }));
    });
    return r;
  },
};
