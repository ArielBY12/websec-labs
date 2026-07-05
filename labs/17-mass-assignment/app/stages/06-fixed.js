'use strict';

// Stage 6 — the fix: a strict allowlist of only non-privileged, user-editable fields.

const express = require('express');
const shared = require('../shared');

const EDITABLE = ['name', 'email', 'bio'];   // role/isAdmin/groups are never here

module.exports = {
  stage: 6,
  slug: 'fixed',
  title: 'Strict field allowlist',
  defense: 'Copies only an explicit allowlist of non-privileged fields.',
  hint: '',
  lesson: 'Bind only an explicit allowlist of user-editable fields; change privilege through a separate, authorized code path.',
  explanation:
    "Only <code>name</code>, <code>email</code>, and <code>bio</code> are ever copied from the request, so <code>role</code>, <code>isAdmin</code>, nested fields, and <code>groups</code> can't be set no matter how they're sent. Privilege changes go through a dedicated authorized endpoint, not the profile update.",
  status: 'secure',

  createRouter(ctx) {
    const r = express.Router();
    const user = { name: 'Alice', email: 'alice@bank.example', bio: 'hi', role: 'user' };
    const isAdmin = (u) => u.role === 'admin';
    const render = () => ({ content: shared.profileForm(ctx) + shared.profilePanel(user, isAdmin(user)), success: isAdmin(user) });

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, render())));
    r.post('/update', (req, res) => {
      let patch; try { patch = JSON.parse(req.body.data || '{}'); } catch { return res.send(shared.stagePage(ctx, { content: shared.profileForm(ctx, req.body.data), result: shared.deniedBanner('⛔ Invalid JSON.') })); }
      for (const k of EDITABLE) if (k in patch) user[k] = patch[k];   //! copy only an explicit allowlist of non-privileged fields — nothing else can be set
      res.send(shared.stagePage(ctx, render()));
    });
    return r;
  },
};
