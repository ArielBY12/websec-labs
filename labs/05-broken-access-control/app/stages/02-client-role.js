'use strict';

// Stage 2 — gates the admin panel on an admin role read from the request's `role` cookie.

const express = require('express');
const shared = require('../shared');

// Read a cookie value from the request (no dependency needed).
const cookie = (req, name) =>
  (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1];

module.exports = {
  stage: 2,
  slug: 'client-role',
  title: 'Trust a client role cookie',
  defense: 'Checks a role value sent by the client.',
  hint: "There's a real check now: <code>role === 'admin'</code>. But where does <code>role</code> come from — the server, or you? Look at the request's cookies. What happens if you send <code>Cookie: role=admin</code>?",
  lesson: "Authorization decisions must use the authenticated server session, never a value the client controls.",
  explanation:
    "The check trusted a <code>role</code> cookie that the client sets. Sending <code>Cookie: role=admin</code> satisfied it instantly — the server never consulted its own session (where you're still just <code>user</code>). " +
    "Any client-supplied value (cookie, header, hidden field) is attacker-controlled and can't decide authorization.",
  status: 'vulnerable',

  createRouter(SQL, ctx) {
    const db = shared.seedUsers(SQL);
    const r = express.Router();

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.dashboard() })));

    r.get('/admin', (req, res) => {
      const role = cookie(req, 'role');   //! the role comes from a client cookie, not the trusted session — send Cookie: role=admin
      if (role !== 'admin') {
        return res.send(shared.stagePage(ctx, { result: shared.deniedBanner() }));
      }
      res.send(shared.stagePage(ctx, { result: shared.adminPanel(ctx.mount, db), success: true }));
    });

    r.post('/admin/promote', (req, res) => {
      if (cookie(req, 'role') !== 'admin') {
        return res.send(shared.stagePage(ctx, { result: shared.deniedBanner() }));
      }
      const role = shared.promote(db, req.body.user || 'alice');
      const result = `<div class="card">✅ ${shared.escapeHtml(req.body.user || 'alice')} is now <strong>${role}</strong>.</div>`
        + shared.adminPanel(ctx.mount, db);
      res.send(shared.stagePage(ctx, { result, success: true }));
    });

    return r;
  },
};
