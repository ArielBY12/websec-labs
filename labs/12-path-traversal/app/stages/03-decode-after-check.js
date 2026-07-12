'use strict';

// Stage 3 — the filename is rejected if it contains "..", but only before it is
// URL-decoded.

const express = require('express');
const fs = require('fs');
const path = require('path');
const shared = require('../shared');

module.exports = {
  stage: 3,
  slug: 'decode-after-check',
  title: 'Check before decode',
  defense: 'Rejects ".." then URL-decodes the name.',
  hint: "A literal <code>..</code> is blocked — but the check runs <em>before</em> the server URL-decodes your input. Encode the dots: <code>%2e%2e/secret.txt</code>.",
  lesson: 'Validate the final value — checking before a later decode step lets encoded traversal slip through.',
  explanation:
    "The guard saw <code>%2e%2e</code> (no literal <code>..</code>) and passed it, then <code>decodeURIComponent</code> turned it into <code>../</code>. Always canonicalize/decode first and validate the resolved path, never the raw input.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.viewerForm(ctx) })));
    r.get('/view', (req, res) => {
      const name = req.query.file || '';
      if (String(name).includes('..'))
        return res.send(shared.stagePage(ctx, { content: shared.viewerForm(ctx, name), result: shared.deniedBanner('⛔ ".." is not allowed.') }));
      const decoded = decodeURIComponent(name);   //! rejects ".." then decodes — %2e%2e slips past the check and becomes ".." afterward
      const full = path.join(shared.DOCS, decoded);
      let out, ok = true;
      try {
        out = fs.readFileSync(full, 'utf8');
      } catch (e) { out = String(e.message || e); ok = false; }
      res.send(shared.stagePage(ctx, { content: shared.viewerForm(ctx, name) + shared.outputPanel(name, out, full), success: ok && shared.escapedDocs(out) }));
    });
    return r;
  },
};
