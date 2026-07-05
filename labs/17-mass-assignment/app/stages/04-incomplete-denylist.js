'use strict';

// Stage 4 — role/isAdmin are stripped recursively, but another privileged field
// (groups) is missed.

const express = require('express');
const shared = require('../shared');

function stripKeys(obj, keys) {
  if (!obj || typeof obj !== 'object') return;
  for (const k of Object.keys(obj)) {
    if (keys.includes(k)) delete obj[k];
    else stripKeys(obj[k], keys);
  }
}

module.exports = {
  stage: 4,
  slug: 'incomplete-denylist',
  title: 'Incomplete denylist',
  defense: 'Recursively strips role and isAdmin.',
  hint: "It now strips <code>role</code> and <code>isAdmin</code> everywhere. But admin here is granted by membership — check your account's <code>groups</code>. Send <code>{\"groups\":[\"admins\"]}</code>.",
  lesson: 'Every field that confers privilege must be protected — a denylist that misses one equivalent field (groups) still loses.',
  explanation:
    "Stripping <code>role</code>/<code>isAdmin</code> ignored <code>groups</code>, which also grants admin. Privilege is often expressed several ways; a denylist can never enumerate them all. Allowlist instead.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const user = { name: 'Alice', email: 'alice@bank.example', groups: ['users'] };
    const isAdmin = (u) => Array.isArray(u.groups) && u.groups.includes('admins');
    const render = () => ({ content: shared.profileForm(ctx) + shared.profilePanel(user, isAdmin(user)), success: isAdmin(user) });

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, render())));
    r.post('/update', (req, res) => {
      let patch; try { patch = JSON.parse(req.body.data || '{}'); } catch { return res.send(shared.stagePage(ctx, { content: shared.profileForm(ctx, req.body.data), result: shared.deniedBanner('⛔ Invalid JSON.') })); }
      stripKeys(patch, ['role', 'isAdmin']);   //! recursively strips role/isAdmin but misses the equally-privileged "groups"
      shared.deepMerge(user, patch);
      res.send(shared.stagePage(ctx, render()));
    });
    return r;
  },
};
