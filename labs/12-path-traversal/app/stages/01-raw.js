'use strict';

// Stage 1 — the requested filename is joined to the docs directory with no checks.

const express = require('express');
const fs = require('fs');
const path = require('path');
const shared = require('../shared');

module.exports = {
  stage: 1,
  slug: 'raw',
  title: 'Raw path join',
  defense: 'None — the filename is joined to the docs directory.',
  hint: "The name you give is appended to the documents directory and read. Directories understand <code>..</code> as “go up one level”. Try <code>../secret.txt</code>.",
  lesson: 'Joining an untrusted filename to a base directory lets ../ climb out of it.',
  explanation:
    "Your <code>../</code> walked up out of the docs directory, so the server read a file it never meant to expose. Resolve the final path and confirm it stays inside the intended directory before reading.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.viewerForm(ctx) })));
    r.post('/view', (req, res) => {
      const name = req.body.file || '';
      let out, ok = true;
      try {
        const full = path.join(shared.DOCS, name);   //! the requested name is joined to the docs dir with no traversal check — ../ escapes it
        out = fs.readFileSync(full, 'utf8');
      } catch (e) { out = String(e.message || e); ok = false; }
      res.send(shared.stagePage(ctx, { content: shared.viewerForm(ctx, name) + shared.outputPanel(name, out), success: ok && shared.escapedDocs(out) }));
    });
    return r;
  },
};
