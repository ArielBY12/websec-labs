'use strict';

// Stage 6 — the hardened deployment: no debug route, generic errors, no dotfiles,
// changed credentials, and authentication on the internal endpoint.

const express = require('express');
const crypto = require('crypto');
const shared = require('../shared');

const ADMIN_PASS = crypto.randomBytes(12).toString('hex');   // changed from the default
const INTERNAL_TOKEN = crypto.randomBytes(16).toString('hex');
const PUBLIC_FILES = { 'index.html': '<h1>Welcome</h1>', 'style.css': 'body{font-family:sans-serif}' };

module.exports = {
  stage: 6,
  slug: 'fixed',
  title: 'Hardened deployment',
  defense: 'No debug route; generic errors; no dotfiles; changed creds; authenticated internal endpoint.',
  hint: '',
  lesson: 'Disable debug/verbose modes, serve only an explicit public directory, change default credentials, and authenticate every sensitive endpoint.',
  explanation:
    "The debug route is gone, errors are generic, the static handler serves only an allowlisted public set (no dotfiles), the admin password was changed off the default, and the internal endpoint requires a token. Every earlier leak is closed; normal endpoints (e.g. <code>/health</code>) still work.",
  status: 'secure',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, {
      content: shared.infoCard('<p>Endpoints: <code>GET /health</code>, <code>GET /static/&lt;public&gt;</code>, <code>POST /admin/login</code>, <code>GET /internal/config</code> (auth).</p>'),
    })));
    r.get('/health', (req, res) => res.send(shared.stagePage(ctx, { content: shared.outputPanel('GET /health', { status: 'ok' }) })));
    r.post('/parse', (req, res) => {
      try { JSON.parse(req.body.data || ''); res.send(shared.stagePage(ctx, { content: shared.outputPanel('Parsed OK', {}) })); }
      catch { res.send(shared.stagePage(ctx, { content: shared.deniedBanner('⛔ Invalid request.') })); }   // generic, no internals
    });
    r.get('/static/:name', (req, res) => {
      const name = req.params.name;
      if (name.startsWith('.') || !(name in PUBLIC_FILES))   //! serve only an explicit public allowlist; never dotfiles or arbitrary project files
        return res.send(shared.stagePage(ctx, { content: shared.deniedBanner('⛔ Not found.') }));
      res.send(shared.stagePage(ctx, { content: shared.outputPanel(name, PUBLIC_FILES[name]) }));
    });
    r.post('/admin/login', (req, res) => {
      const { username = '', password = '' } = req.body;
      if (username === 'admin' && password === ADMIN_PASS)
        return res.send(shared.stagePage(ctx, { content: shared.outputPanel('Admin console', { ok: true }) }));
      res.send(shared.stagePage(ctx, { content: shared.deniedBanner('⛔ Invalid credentials.') }));
    });
    r.get('/internal/config', (req, res) => {
      if (req.get('x-internal-token') !== INTERNAL_TOKEN)
        return res.send(shared.stagePage(ctx, { content: shared.deniedBanner('⛔ Unauthorized.') }));
      res.send(shared.stagePage(ctx, { content: shared.outputPanel('config', { db: 'primary' }) }));
    });
    r.get('/debug', (req, res) => res.send(shared.stagePage(ctx, { content: shared.deniedBanner('⛔ Not found.') })));   // disabled
    return r;
  },
};
