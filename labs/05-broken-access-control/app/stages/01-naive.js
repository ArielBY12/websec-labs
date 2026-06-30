'use strict';

// Stage 1 — the admin panel exists at /admin with NO authorization check. The home
// page simply doesn't show the link to regular users, so the developer assumes
// they'll never reach it. But the endpoint is one direct request away.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 1,
  slug: 'naive',
  title: 'No access check',
  defense: 'None — /admin is open to anyone.',
  hint: "The home page (your dashboard) has no admin link — but that's just the UI hiding it. The panel still lives at a fixed URL. Try requesting <code>/stage/1/admin</code> directly (\"forced browsing\").",
  lesson: 'Hiding a link in the UI is not access control — the endpoint must check authorization itself.',
  explanation:
    "The <code>/admin</code> route never checked who you are; the only thing \"protecting\" it was that regular users aren't shown the link. " +
    "Requesting the URL directly (forced browsing) walked straight into admin-only functionality. This is missing function-level access control.",
  status: 'vulnerable',

  createRouter(SQL, ctx) {
    const db = shared.seedUsers(SQL);
    const r = express.Router();

    // Regular-user dashboard — the only thing the UI links to.
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.dashboard() })));

    // Admin panel — no check at all.
    r.get('/admin', (req, res) => {
      const result = shared.adminPanel(ctx.mount, db);   //! no authorization check — the admin panel is served to anyone who asks
      res.send(shared.stagePage(ctx, { result, success: true }));
    });

    // Privileged action — also unprotected here.
    r.post('/admin/promote', (req, res) => {
      const role = shared.promote(db, req.body.user || 'alice');
      const result = `<div class="card">✅ ${shared.escapeHtml(req.body.user || 'alice')} is now <strong>${role}</strong>.</div>`
        + shared.adminPanel(ctx.mount, db);
      res.send(shared.stagePage(ctx, { result, success: true }));
    });

    return r;
  },
};
