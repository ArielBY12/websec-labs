'use strict';

// Stage 4 — the fix: one authorization middleware guards the ENTIRE /admin subtree
// (page and every action) using the trusted session role, deny by default. There's
// no route an attacker can reach without passing the check, and no per-path list to
// forget to update.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 4,
  slug: 'fixed',
  title: 'Deny-by-default authorization',
  defense: 'Session role enforced on every admin route (deny by default).',
  hint: '',
  lesson: 'Protect the whole privileged area with one central, server-side check; deny by default so no route can be reached unauthorized.',
  explanation:
    "A single <code>requireAdmin</code> middleware is mounted on <code>/admin</code>, so it runs before the page AND before every action under it — using the trusted session role, denying by default. " +
    "Forced browsing, a forged cookie, or hitting the action directly all hit the same check first. Regular-user pages keep working; only admin functionality is gated.",
  status: 'secure',

  createRouter(SQL, ctx) {
    const db = shared.seedUsers(SQL);
    const r = express.Router();

    // Regular-user dashboard — no privilege required (positive control).
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.dashboard() })));

    // One central guard for the whole /admin subtree, from the trusted session.
    const requireAdmin = (req, res, next) =>
      shared.SESSION.role === 'admin' ? next() : res.send(shared.stagePage(ctx, { result: shared.deniedBanner() }));
    r.use('/admin', requireAdmin);   //! one server-side check guards the entire /admin subtree (page + every action), deny by default

    r.get('/admin', (req, res) => res.send(shared.stagePage(ctx, { result: shared.adminPanel(ctx.mount, db) })));

    r.post('/admin/promote', (req, res) => {
      const role = shared.promote(db, req.body.user || 'alice');
      const result = `<div class="card">✅ ${shared.escapeHtml(req.body.user || 'alice')} is now <strong>${role}</strong>.</div>`
        + shared.adminPanel(ctx.mount, db);
      res.send(shared.stagePage(ctx, { result }));
    });

    return r;
  },
};
