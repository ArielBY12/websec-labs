'use strict';

// Stage 5 — the resolved path must start with the docs directory, but the check has
// no trailing separator, so a sibling whose name starts with "docs" passes.

const express = require('express');
const fs = require('fs');
const path = require('path');
const shared = require('../shared');

module.exports = {
  stage: 5,
  slug: 'prefix-check',
  title: 'startsWith without a separator',
  defense: 'Resolves the path; requires it to start with the docs dir.',
  hint: "It resolves the path and checks <code>startsWith(docsDir)</code> — but with no trailing slash. A sibling file whose name <em>begins</em> with the dir name matches. There's a <code>docs_secret.txt</code> next to the <code>docs</code> directory: <code>../docs_secret.txt</code>.",
  lesson: 'A prefix check without a trailing separator treats /base-evil as inside /base.',
  explanation:
    "<code>/…/docs_secret.txt</code> starts with <code>/…/docs</code>, so the check passed even though the file is a sibling of the directory, not inside it. Compare against <code>base + path.sep</code> (and allow the base itself).",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.viewerForm(ctx) })));
    r.post('/view', (req, res) => {
      const name = req.body.file || '';
      const full = path.resolve(shared.DOCS, decodeURIComponent(name));
      if (!full.startsWith(shared.DOCS))   //! prefix check without a trailing separator — a sibling like docs_secret.txt matches "docs"
        return res.send(shared.stagePage(ctx, { content: shared.viewerForm(ctx, name), result: shared.deniedBanner('⛔ Outside the docs directory.') }));
      let out, ok = true;
      try { out = fs.readFileSync(full, 'utf8'); } catch (e) { out = String(e.message || e); ok = false; }
      res.send(shared.stagePage(ctx, { content: shared.viewerForm(ctx, name) + shared.outputPanel(name, out, full), success: ok && shared.escapedDocs(out) }));
    });
    return r;
  },
};
