'use strict';

// Stage 4 — the secure version: encodes the term on output before reflecting it.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 4,
  slug: 'fixed',
  title: 'Output encoding',
  defense: 'HTML-encodes the term before writing it into the page.',
  hint: '',
  lesson: 'Contextual output encoding makes input inert text — the whole bug class disappears.',
  explanation:
    "Every dangerous character (<code>&lt; &gt; &amp; &quot;</code>) is replaced with its HTML entity, so the browser renders the payload as visible text instead of parsing it as markup. No tag, no handler, nothing to execute.",
  status: 'secure',

  createRouter(ctx) {
    const r = express.Router();

    r.get('/', (req, res) => {
      const q = req.query.q;
      let result = '', fired = false;
      if (q !== undefined) {
        const reflected = shared.escapeHtml(q);   //! SECURE: encode on output for the HTML-text context — input can only be text
        fired = /<[a-z]/i.test(reflected);
        result = `<p>You searched for: ${reflected}</p>`;
      }
      res.send(shared.stagePage(ctx, { content: shared.searchForm(ctx.mount, q || ''), result, success: fired }));
    });

    return r;
  },
};
