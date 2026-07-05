'use strict';

// Stage 4 — the extension is allowlisted, but the file is served with the client's
// Content-Type.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 4,
  slug: 'serve-client-type',
  title: 'Allowlisted extension, client type on serve',
  defense: 'Requires an image extension; serves with the claimed Content-Type.',
  hint: "Now the extension must be an image (<code>.png</code>/<code>.jpg</code>/<code>.gif</code>). But the file is served back with the <em>Content-Type you supplied</em>. Upload <code>avatar.png</code> with content <code>&lt;script&gt;…&lt;/script&gt;</code> and claimed type <code>text/html</code>.",
  lesson: 'Even with a safe extension, echoing the client Content-Type on download makes the file executable.',
  explanation:
    "The extension check passed, but the response used your <code>text/html</code> Content-Type, so the browser rendered the script. The served type must be decided server-side from the validated file, never taken from the request.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const store = new Map();

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.uploadForm(ctx) })));
    r.post('/upload', (req, res) => {
      const { filename = '', content = '', mimetype = '' } = req.body;
      if (!/\.(png|jpe?g|gif)$/i.test(filename))
        return res.send(shared.stagePage(ctx, { content: shared.uploadForm(ctx, req.body), result: shared.deniedBanner('⛔ Only .png/.jpg/.gif are allowed.') }));
      const type = mimetype;   //! extension is allowlisted, but the file is served with the client-supplied Content-Type
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
