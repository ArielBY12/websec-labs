'use strict';

// Stage 3 — the role check is finally done against the trusted session, and the
// /admin PAGE correctly refuses a regular user. But the privileged ACTION,
// POST /admin/promote, was added separately and never got the check. Attackers
// call the action directly instead of going through the page.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 3,
  slug: 'actions-unguarded',
  title: 'Guards the page, not the action',
  defense: 'Admin page checks the session role; the action doesn\'t.',
  hint: "The <code>/admin</code> page now correctly denies you (the session says role <code>user</code>). But the page isn't the only way to act — the form posts to <code>/admin/promote</code>. Is that endpoint checked? Send the POST directly.",
  lesson: 'Authorize every privileged endpoint — especially state-changing actions, not just the page that shows them.',
  explanation:
    "The view route checked <code>SESSION.role === 'admin'</code> and denied you. But <code>POST /admin/promote</code> performed the privilege change with no check at all. " +
    "Attackers don't use your UI flow — they call the action endpoint directly. Guarding the page while leaving the action open protects nothing.",
  status: 'vulnerable',

  createRouter(SQL, ctx) {
    const db = shared.seedUsers(SQL);
    const r = express.Router();

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.dashboard() })));

    // The page IS protected — using the trusted session role.
    r.get('/admin', (req, res) => {
      if (shared.SESSION.role !== 'admin') {
        return res.send(shared.stagePage(ctx, { result: shared.deniedBanner() }));
      }
      res.send(shared.stagePage(ctx, { result: shared.adminPanel(ctx.mount, db) }));
    });

    // The action is NOT protected — the check was forgotten here.
    r.post('/admin/promote', (req, res) => {
      const role = shared.promote(db, req.body.user || 'alice');   //! the privileged action runs with no authorization check — the guard is only on the page
      const result = `<div class="card">✅ ${shared.escapeHtml(req.body.user || 'alice')} is now <strong>${role}</strong>.</div>`;
      res.send(shared.stagePage(ctx, { result, success: true }));
    });

    return r;
  },
};
