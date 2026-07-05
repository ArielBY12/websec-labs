'use strict';

// Stage 6 — the fix: allowlist the single final extension, store under a random
// server-generated name, and serve with a server-decided type + nosniff.

const express = require('express');
const crypto = require('crypto');
const shared = require('../shared');

module.exports = {
  stage: 6,
  slug: 'fixed',
  title: 'Server-decided name, type, and nosniff',
  defense: 'Allowlist the final extension; random name; server-chosen image type; X-Content-Type-Options: nosniff.',
  hint: '',
  lesson: 'Let nothing client-controlled decide how a file is stored or served: allowlist the type, generate the name, set a safe Content-Type, and send X-Content-Type-Options: nosniff.',
  explanation:
    "The client's name and Content-Type are ignored. The single final extension is allowlisted to an image type, the file is stored under a random name, and it's served with a server-decided image Content-Type plus <code>nosniff</code> — so it can never be interpreted as HTML/JS. A real image still uploads and displays.",
  status: 'secure',

  createRouter(ctx) {
    const r = express.Router();
    const store = new Map();

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.uploadForm(ctx) })));
    r.post('/upload', (req, res) => {
      const { filename = '', content = '' } = req.body;
      const ext = String(filename).toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
      if (!['png', 'jpg', 'jpeg', 'gif'].includes(ext))
        return res.send(shared.stagePage(ctx, { content: shared.uploadForm(ctx, req.body), result: shared.deniedBanner('⛔ Only image files are allowed.') }));
      const stored = crypto.randomBytes(8).toString('hex') + '.' + ext;
      const type = shared.typeByExt('x.' + ext);   //! ignore the client's name/type: random stored name, server-chosen image Content-Type, and nosniff on serve
      store.set(stored, { content, type });
      res.send(shared.stagePage(ctx, { content: shared.uploadForm(ctx, req.body) + shared.uploadResult(ctx, stored, type) }));
    });
    r.get('/files/:name', (req, res) => {
      const f = store.get(req.params.name);
      if (!f) return res.status(404).send('not found');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Type', f.type);
      res.send(f.content);
    });
    return r;
  },
};
