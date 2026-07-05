'use strict';

// Stage 1 — the whole request body is merged into the user object.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 1,
  slug: 'full-merge',
  title: 'Full-body merge',
  defense: 'None — the request body is merged in wholesale.',
  hint: "Whatever JSON you send is copied onto your account. Add the privileged field: <code>{\"role\":\"admin\"}</code>.",
  lesson: 'Merging a request body wholesale lets a client set fields it was never meant to (role, isAdmin, …).',
  explanation:
    "<code>Object.assign(user, body)</code> copied your <code>role</code> straight onto the account. Bind only an explicit allowlist of user-editable fields; never assign the raw body.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const user = { name: 'Alice', email: 'alice@bank.example', bio: 'hi', role: 'user' };
    const isAdmin = (u) => u.role === 'admin';
    const render = () => ({ content: shared.profileForm(ctx) + shared.profilePanel(user, isAdmin(user)), success: isAdmin(user) });

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, render())));
    r.post('/update', (req, res) => {
      let patch; try { patch = JSON.parse(req.body.data || '{}'); } catch { return res.send(shared.stagePage(ctx, { content: shared.profileForm(ctx, req.body.data), result: shared.deniedBanner('⛔ Invalid JSON.') })); }
      Object.assign(user, patch);   //! merges the entire request body into the user — role (or any field) can be set
      res.send(shared.stagePage(ctx, render()));
    });
    return r;
  },
};
