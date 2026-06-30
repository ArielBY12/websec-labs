'use strict';

// Stage 2 — strips <script> tags from the term before reflecting it.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 2,
  slug: 'blacklist',
  title: 'Blacklist the script tag',
  defense: 'Strips <script> tags from the term.',
  hint: "The <code>&lt;script&gt;</code> tag is removed. Are scripts the only way to run JS? Many ordinary tags fire JavaScript through <em>event handler</em> attributes — think of an image whose <code>src</code> fails to load.",
  lesson: 'A blacklist only blocks what it lists; event-handler attributes need no script tag.',
  explanation:
    "The filter deleted <code>&lt;script&gt;</code> tags, but an <code>&lt;img&gt;</code> with an <code>onerror</code> handler runs JavaScript with no script tag at all. " +
    "The blacklist never modelled that vector, so the payload sailed through untouched.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();

    r.get('/', (req, res) => {
      const q = req.query.q;
      let result = '', fired = false;
      if (q !== undefined) {
        const reflected = q.replace(/<\/?script\b[^>]*>/gi, '');   //! defense: removes <script> tags — but nothing else that runs JS
        fired = /<[a-z]/i.test(reflected);
        result = `<p>You searched for: ${reflected}</p>`;
      }
      res.send(shared.stagePage(ctx, { content: shared.searchForm(ctx.mount, q || ''), result, success: fired }));
    });

    return r;
  },
};
