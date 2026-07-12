'use strict';

// Stage 4 — the LAST extension must be an image, but the server maps the type from
// the FIRST extension in a multi-dotted name.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 4,
  slug: 'double-extension',
  title: 'Double extension',
  defense: 'Allowlists the final extension; serves by the first one.',
  hint: "The final extension must be an image, and the served type is decided server-side now — but it's read from the <em>first</em> dotted segment. Give it both: <code>avatar.html.png</code>.",
  lesson: 'Multi-dotted filenames split defenders and servers — validate and serve using the same, single, final extension.',
  explanation:
    "The allowlist saw <code>.png</code> (last) while the type map read <code>.html</code> (first), so the file was served as <code>text/html</code>. Normalize to one canonical extension for both the check and the served type (and store under a name you generate).",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const store = new Map();

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.uploadForm(ctx) })));
    r.post('/upload', (req, res) => {
      const { filename = '', content = '' } = req.body;
      if (!/\.(png|jpe?g|gif)$/i.test(filename))
        return res.send(shared.stagePage(ctx, { content: shared.uploadForm(ctx, req.body), result: shared.deniedBanner('⛔ File must end in .png/.jpg/.gif.') }));
      const firstExt = String(filename).split('.')[1] || '';
      const type = shared.typeByExt('x.' + firstExt);   //! serves by the FIRST extension in a multi-dotted name — avatar.html.png is served as text/html
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
