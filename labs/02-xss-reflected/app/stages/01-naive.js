'use strict';

// Stage 1 — the search page reflects your query term back into the response.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 1,
  slug: 'naive',
  title: 'Naive reflection',
  defense: 'None — the search term is echoed back as-is.',
  hint: "Your term lands directly inside the page's HTML. What if it isn't text but a tag — e.g. <code>&lt;script&gt;alert(1)&lt;/script&gt;</code> or an image with an error handler?",
  lesson: 'Input written into HTML without encoding becomes markup, not text.',
  explanation:
    "Your input was never encoded, so the browser parsed <code>&lt;script&gt;</code> as a real element and executed it. " +
    "The reflection point treated attacker-controlled text as HTML — that is reflected XSS in one line.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();

    r.get('/', (req, res) => {
      const q = req.query.q;
      let result = '', fired = false;
      if (q !== undefined) {
        const reflected = q;   //! VULNERABLE: raw input echoed into the HTML — no output encoding
        fired = /<[a-z]/i.test(reflected);
        result = `<p>You searched for: ${reflected}</p>`;
      }
      res.send(shared.stagePage(ctx, { content: shared.searchForm(ctx.mount, q || ''), result, success: fired }));
    });

    return r;
  },
};
