'use strict';

// Stage 3 — the static file server exposes everything in the web root, including
// dotfiles like .env.

const express = require('express');
const shared = require('../shared');

const FILES = {
  'index.html': '<h1>Welcome</h1>',
  'style.css': 'body{font-family:sans-serif}',
  '.env': `NODE_ENV=production\nAPI_KEY=live_5f3a\nSECRET=${shared.FLAG}\n`,
};

module.exports = {
  stage: 3,
  slug: 'exposed-dotfile',
  title: 'Exposed dotfile / backup',
  defense: 'A static file server for the web root.',
  hint: "The static server hands out any file in the web root — including config files that shouldn't ship. Try <code>GET /static/.env</code>.",
  lesson: 'Never serve the whole project directory — dotfiles, backups, and .env leak secrets; serve an explicit public subset.',
  explanation:
    "The static handler returned <code>.env</code> verbatim. Deployments frequently leak <code>.env</code>, <code>.git</code>, or <code>*.bak</code> because the doc root includes them. Serve only an explicit public directory and block dotfiles.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, {
      content: shared.infoCard('<p>Static files at <code>GET /static/&lt;name&gt;</code> (e.g. index.html).</p>'),
    })));
    r.get('/static/:name', (req, res) => {
      const content = FILES[req.params.name];   //! serves any file in the web root, including dotfiles like .env
      if (content === undefined) return res.send(shared.stagePage(ctx, { content: shared.deniedBanner('⛔ Not found.') }));
      res.send(shared.stagePage(ctx, { content: shared.outputPanel(req.params.name, content), success: shared.leaked(content) }));
    });
    return r;
  },
};
