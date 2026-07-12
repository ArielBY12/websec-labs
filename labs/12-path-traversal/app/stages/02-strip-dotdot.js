'use strict';

// Stage 2 — the filter removes "../" sequences, but only in a single pass.

const express = require('express');
const fs = require('fs');
const path = require('path');
const shared = require('../shared');

module.exports = {
  stage: 2,
  slug: 'strip-dotdot',
  title: 'Non-recursive "../" strip',
  defense: 'Removes "../" from the filename.',
  hint: "It deletes <code>../</code>, but only once and without re-scanning. Nest it so removing the inner one re-forms it: <code>....//secret.txt</code>.",
  lesson: 'A single-pass strip can re-create the sequence it removed — sanitizers must loop to a fixed point.',
  explanation:
    "Removing <code>../</code> from <code>....//</code> leaves <code>../</code> behind, because the result isn't re-scanned. Iterative-strip path filters are classically bypassable; resolve and bounds-check instead.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.viewerForm(ctx) })));
    r.post('/view', (req, res) => {
      const name = req.body.file || '';
      const clean = String(name).replace(/\.\.\//g, '');   //! strips "../" in a single pass — "....//" collapses back into "../"
      const full = path.join(shared.DOCS, clean);
      let out, ok = true;
      try {
        out = fs.readFileSync(full, 'utf8');
      } catch (e) { out = String(e.message || e); ok = false; }
      res.send(shared.stagePage(ctx, { content: shared.viewerForm(ctx, name) + shared.outputPanel(name, out, full), success: ok && shared.escapedDocs(out) }));
    });
    return r;
  },
};
