'use strict';

// Stage 5 — an allowlist at last, but a privileged field was mistakenly included.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 5,
  slug: 'allowlist-mistake',
  title: 'Allowlist with a mistaken field',
  defense: 'Copies only allowlisted fields — but role is on the list.',
  hint: "This one uses an allowlist (good!) — but read it carefully: a privileged field slipped onto it. Send <code>{\"role\":\"admin\"}</code>.",
  lesson: 'An allowlist only works if it excludes every privileged field — one mistaken entry reopens the hole.',
  explanation:
    "The allowlist approach is right, but <code>role</code> was left on the list, so it was copied through. Allowlists must be reviewed to contain strictly non-privileged, user-editable fields.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const user = { name: 'Alice', email: 'alice@bank.example', bio: 'hi', role: 'user' };
    const isAdmin = (u) => u.role === 'admin';
    const render = () => ({ content: shared.profileForm(ctx) + shared.profilePanel(user, isAdmin(user)), success: isAdmin(user) });

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, render())));
    r.post('/update', (req, res) => {
      let patch; try { patch = JSON.parse(req.body.data || '{}'); } catch { return res.send(shared.stagePage(ctx, { content: shared.profileForm(ctx, req.body.data), result: shared.deniedBanner('⛔ Invalid JSON.') })); }
      const ALLOW = ['name', 'email', 'bio', 'role'];   // fields a user may edit
      for (const k of Object.keys(patch)) if (ALLOW.includes(k)) user[k] = patch[k];   //! an allowlist — but "role" was mistakenly included in it
      res.send(shared.stagePage(ctx, render()));
    });
    return r;
  },
};
