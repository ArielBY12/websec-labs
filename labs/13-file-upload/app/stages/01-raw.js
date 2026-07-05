'use strict';

// Stage 1 — any file is stored and served back with a Content-Type from its extension.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 1,
  slug: 'raw',
  title: 'No validation',
  defense: 'None — any file is stored and served by extension.',
  hint: "There are no checks. Upload a file named <code>evil.html</code> whose content is <code>&lt;script&gt;alert(1)&lt;/script&gt;</code> — it's served as <code>text/html</code> and runs.",
  lesson: 'Serving user files with an executable Content-Type turns an upload into stored XSS (or worse).',
  explanation:
    "The file was served as <code>text/html</code> because of its <code>.html</code> extension, so the browser ran your script. Never serve user uploads with a document/script type; force a safe, server-chosen type.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const store = new Map();

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.uploadForm(ctx) })));
    r.post('/upload', (req, res) => {
      const { filename = '', content = '' } = req.body;
      const type = shared.typeByExt(filename);   //! no validation — the file is served with a Content-Type from its extension, so an .html upload runs as a page
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
