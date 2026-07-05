'use strict';

// Stage 2 — dangerous extensions are blacklisted, but the check is case-sensitive.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 2,
  slug: 'ext-blacklist',
  title: 'Case-sensitive extension blacklist',
  defense: 'Rejects .html/.htm/.php/.svg/.js (lowercase).',
  hint: "Lowercase dangerous extensions are blocked, but the check is case-sensitive while the server maps the type case-insensitively. Upload <code>evil.HTML</code>.",
  lesson: 'A case-sensitive blacklist is bypassed by changing case; file systems and type maps are often case-insensitive.',
  explanation:
    "<code>.HTML</code> didn't match the lowercase blacklist, yet the type map lowercased it to <code>text/html</code> — so it ran. Blacklists must be case-insensitive and complete; better, allowlist safe types.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const store = new Map();

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.uploadForm(ctx) })));
    r.post('/upload', (req, res) => {
      const { filename = '', content = '' } = req.body;
      if (/\.(html?|php|svg|js)$/.test(filename))   //! case-sensitive blacklist — .HTML slips past, then is served as text/html
        return res.send(shared.stagePage(ctx, { content: shared.uploadForm(ctx, req.body), result: shared.deniedBanner('⛔ That file type is not allowed.') }));
      const type = shared.typeByExt(filename);
      store.set(filename, { content, type });
      res.send(shared.stagePage(ctx, { content: shared.uploadForm(ctx, req.body) + shared.uploadResult(ctx, filename, type), success: shared.xssable(type, content) }));
    });
    r.get('/files/:name', (req, res) => {
      const f = store.get(req.params.name);
      if (!f) return res.status(404).send('not found');
      res.setHeader('Content-Type', f.type);
      res.send(f.content);
    });
    return r;
  },
};
