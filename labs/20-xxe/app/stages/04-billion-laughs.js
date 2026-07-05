'use strict';

// Stage 4 — external entities are off, but internal entity expansion has no limit.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 4,
  slug: 'billion-laughs',
  title: 'Entity expansion (billion laughs)',
  defense: 'External entities disabled; internal entities unrestricted.',
  hint: "No files this time — but nested internal entities expand exponentially. Define <code>a</code>, then <code>b</code> = ten <code>&amp;a;</code>, <code>c</code> = ten <code>&amp;b;</code>, <code>d</code> = ten <code>&amp;c;</code>, and reference <code>&amp;d;</code>. (Use a marker like <code>XXE{lol}</code> as the base so the blow-up is visible.)",
  lesson: 'Unbounded entity expansion is a denial-of-service (billion laughs) — cap expansion depth/size.',
  explanation:
    "Ten-fold nesting four levels deep expands the base ~10 000×; real payloads reach gigabytes and exhaust memory. Limit entity expansion (count, depth, and total size), or disable DTDs.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.xmlForm(ctx) })));
    r.post('/import', (req, res) => {
      const xml = req.body.xml || '';
      const result = shared.resolveXml(xml, {});   //! internal entities expand with no cap on count/size — a nested "billion laughs" payload blows up
      res.send(shared.stagePage(ctx, { content: shared.xmlForm(ctx, xml) + shared.resultPanel(result), success: /XXE\{/.test(result) && result.length > 5000 }));
    });
    return r;
  },
};
