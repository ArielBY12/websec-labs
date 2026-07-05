'use strict';

// Stage 3 — the blacklist checks only top-level keys, but the merge is recursive and
// the role lives in a nested object.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 3,
  slug: 'nested',
  title: 'Nested field via deep merge',
  defense: 'Deletes top-level role/isAdmin; deep-merges the rest.',
  hint: "Top-level <code>role</code> and <code>isAdmin</code> are stripped — but the merge is recursive and your role lives under <code>account</code>. Send it nested: <code>{\"account\":{\"role\":\"admin\"}}</code>.",
  lesson: 'A top-level-only blacklist misses privileged fields nested inside objects that a deep merge will set.',
  explanation:
    "The guard deleted top-level keys, but <code>account.role</code> was set by the recursive merge. Validating only the outer keys ignores the structure a deep merge actually writes.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const user = { name: 'Alice', email: 'alice@bank.example', account: { plan: 'free', role: 'user' } };
    const isAdmin = (u) => u.account?.role === 'admin';
    const render = () => ({ content: shared.profileForm(ctx) + shared.profilePanel(user, isAdmin(user)), success: isAdmin(user) });

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, render())));
    r.post('/update', (req, res) => {
      let patch; try { patch = JSON.parse(req.body.data || '{}'); } catch { return res.send(shared.stagePage(ctx, { content: shared.profileForm(ctx, req.body.data), result: shared.deniedBanner('⛔ Invalid JSON.') })); }
      delete patch.role; delete patch.isAdmin;   //! blacklist checks only top-level keys, but the deep merge below sets nested account.role
      shared.deepMerge(user, patch);
      res.send(shared.stagePage(ctx, render()));
    });
    return r;
  },
};
