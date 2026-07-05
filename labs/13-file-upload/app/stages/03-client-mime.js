'use strict';

// Stage 3 — the upload is accepted only if the client says it's an image, but the
// file is still served by its extension.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 3,
  slug: 'client-mime',
  title: 'Trusts the client Content-Type',
  defense: 'Requires the claimed Content-Type to be image/*.',
  hint: "It checks the <em>claimed</em> Content-Type — which you send. Upload <code>evil.html</code> but set the claimed type to <code>image/png</code>. It's still served as <code>text/html</code> by its extension.",
  lesson: 'The client-supplied Content-Type is attacker-controlled; it proves nothing about the file.',
  explanation:
    "The MIME header came from your request, so claiming <code>image/png</code> passed the check while the <code>.html</code> extension decided the served type. Never trust the client's declared type; determine it server-side and serve safely.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const store = new Map();

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.uploadForm(ctx) })));
    r.post('/upload', (req, res) => {
      const { filename = '', content = '', mimetype = '' } = req.body;
      if (!/^image\//.test(mimetype))   //! trusts the client-supplied Content-Type, but serves the file by its extension
        return res.send(shared.stagePage(ctx, { content: shared.uploadForm(ctx, req.body), result: shared.deniedBanner('⛔ Only image uploads are allowed.') }));
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
