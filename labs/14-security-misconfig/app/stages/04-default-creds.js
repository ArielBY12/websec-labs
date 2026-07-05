'use strict';

// Stage 4 — the admin panel still uses the default credentials it shipped with.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 4,
  slug: 'default-creds',
  title: 'Default credentials',
  defense: 'An admin panel at /admin/login.',
  hint: "The admin panel was deployed but never had its shipped credentials changed. Try the classic default: <code>admin</code> / <code>admin</code>.",
  lesson: 'Default/shipped credentials must be changed on deploy — attackers try them first.',
  explanation:
    "The admin account kept its out-of-the-box <code>admin/admin</code> login, so the panel (and its secret) opened immediately. Force a credential change on first run and never ship working defaults.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, {
      content: shared.infoCard('<p>Admin panel: <code>POST /admin/login</code> {username, password}.</p>'),
    })));
    r.post('/admin/login', (req, res) => {
      const { username = '', password = '' } = req.body;
      if (username === 'admin' && password === 'admin')   //! admin panel still uses the default admin/admin credentials
        return res.send(shared.stagePage(ctx, { content: shared.outputPanel('Admin console', { secret: shared.FLAG }), success: true }));
      res.send(shared.stagePage(ctx, { content: shared.deniedBanner('⛔ Invalid credentials.') }));
    });
    return r;
  },
};
