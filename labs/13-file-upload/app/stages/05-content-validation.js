'use strict';

// Stage 5 — the name is ignored entirely; the file's own bytes must look like a real
// image, and the served type is decided from that detected content. But SVG is a real,
// valid image that also runs script.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 5,
  slug: 'content-validation',
  title: 'Content sniffing (magic bytes)',
  defense: "Ignores the name; requires the content to be a real image and serves the detected type.",
  hint: "The name no longer matters — the bytes must be a genuine image, and the served type comes from what's detected. But one image format is also active content. Upload an <code>&lt;svg&gt;</code> that carries a <code>&lt;script&gt;</code>.",
  lesson: "\"Is it a valid image?\" is not \"is it inert?\" — SVG is a legitimate image that also executes script.",
  explanation:
    "The content check saw well-formed SVG and accepted it as a real image, then served it as <code>image/svg+xml</code> — an active document — so the script ran. Confirming a file is a genuine image doesn't make it safe; allowlist specific <em>inert</em> (raster) formats, and serve active ones like SVG only as <code>attachment</code> or under a CSP.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const store = new Map();

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.uploadForm(ctx) })));
    // Accept only files whose own bytes are a real image; serve the detected type.
    function detectImage(content) {
      const c = String(content);
      if (c.startsWith('\x89PNG')) return 'image/png';
      if (c.startsWith('GIF87a') || c.startsWith('GIF89a')) return 'image/gif';
      if (c.startsWith('\xff\xd8')) return 'image/jpeg';
      if (/<svg[\s>]/i.test(c)) return 'image/svg+xml';   //! SVG is a real, valid image — but it's XML/active content, so a script-bearing <svg> is accepted and served executable
      return null;
    }

    r.post('/upload', (req, res) => {
      const { filename = '', content = '' } = req.body;
      const type = detectImage(content);
      if (!type)
        return res.send(shared.stagePage(ctx, { content: shared.uploadForm(ctx, req.body), result: shared.deniedBanner('⛔ Content is not a recognized image.') }));
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
