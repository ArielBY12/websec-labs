'use strict';

// Stage 4 — the decoded name is rejected if it contains "..". But the path is then
// resolved, and an absolute path needs no "..".

const express = require('express');
const fs = require('fs');
const path = require('path');
const shared = require('../shared');

module.exports = {
  stage: 4,
  slug: 'block-dotdot',
  title: 'Blocks ".." — but not absolute paths',
  defense: 'Decodes, rejects "..", then resolves the path.',
  hint: "The decoded name is checked for <code>..</code> now. But you don't need <code>..</code> to escape — an absolute path goes straight to the target. Try <code>/etc/passwd</code>.",
  lesson: 'Blocking ".." ignores absolute paths, which reference any location without climbing.',
  explanation:
    "<code>path.resolve</code> treats an absolute argument as the whole path, so <code>/etc/passwd</code> — which contains no <code>..</code> — was read directly. Reject absolute inputs and confirm the resolved path is inside the base directory.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.viewerForm(ctx) })));
    r.get('/view', (req, res) => {
      const name = req.query.file || '';
      const decoded = decodeURIComponent(name);
      if (decoded.includes('..'))
        return res.send(shared.stagePage(ctx, { content: shared.viewerForm(ctx, name), result: shared.deniedBanner('⛔ ".." is not allowed.') }));
      const full = path.resolve(shared.DOCS, decoded);   //! blocks ".." but path.resolve honors an absolute path — /etc/passwd needs no ".."
      let out, ok = true;
      try {
        out = fs.readFileSync(full, 'utf8');
      } catch (e) { out = String(e.message || e); ok = false; }
      res.send(shared.stagePage(ctx, { content: shared.viewerForm(ctx, name) + shared.outputPanel(name, out, full), success: ok && shared.escapedDocs(out) }));
    });
    return r;
  },
};
