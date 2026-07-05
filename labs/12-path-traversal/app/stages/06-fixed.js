'use strict';

// Stage 6 — the fix: resolve the path, then require it to be the base dir itself or
// strictly inside it (base + separator). Rejects traversal, siblings, and absolutes.

const express = require('express');
const fs = require('fs');
const path = require('path');
const shared = require('../shared');

module.exports = {
  stage: 6,
  slug: 'fixed',
  title: 'Resolve then bounds-check',
  defense: 'Resolves the path and confirms it is within the docs dir (base + separator).',
  hint: '',
  lesson: 'Resolve the final path and require it to equal the base or start with base + path.sep; reject everything else.',
  explanation:
    "The requested name is resolved to an absolute path and then required to sit inside the docs directory (<code>base + path.sep</code>), so <code>../</code>, encoded dots, absolute paths, and sibling-prefix names are all rejected — while real documents still open. Validate the canonical, resolved path, never the raw string.",
  status: 'secure',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.viewerForm(ctx) })));
    r.post('/view', (req, res) => {
      const name = req.body.file || '';
      const full = path.resolve(shared.DOCS, decodeURIComponent(name));
      if (full !== shared.DOCS && !full.startsWith(shared.DOCS + path.sep))   //! resolve, then require the result to be within the docs dir (base + separator) — rejects traversal, siblings, and absolute paths
        return res.send(shared.stagePage(ctx, { content: shared.viewerForm(ctx, name), result: shared.deniedBanner('⛔ Outside the docs directory.') }));
      let out;
      try { out = fs.readFileSync(full, 'utf8'); } catch (e) { out = String(e.message || e); }
      res.send(shared.stagePage(ctx, { content: shared.viewerForm(ctx, name) + shared.outputPanel(name, out) }));
    });
    return r;
  },
};
