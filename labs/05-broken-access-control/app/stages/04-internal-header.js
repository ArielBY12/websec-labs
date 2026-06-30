'use strict';

// Stage 4 — the admin panel is restricted to "internal" requests, detected from the
// X-Forwarded-For header.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 4,
  slug: 'internal-header',
  title: 'Trusts an internal-only header',
  defense: 'Admin access limited to "internal" requests (via X-Forwarded-For).',
  hint: "The panel is now limited to internal/office traffic — the server decides that from the <code>X-Forwarded-For</code> header. But who actually sets that header on a request? Try adding <code>X-Forwarded-For: 127.0.0.1</code>.",
  lesson: 'Network/proxy headers (X-Forwarded-For, etc.) are client-controlled and must never be the basis of an authorization decision.',
  explanation:
    "Access was granted because the request <em>looked</em> internal — but <code>X-Forwarded-For</code> is just a header the client sets. Sending <code>X-Forwarded-For: 127.0.0.1</code> impersonated an internal request. " +
    "Forwarding headers are attacker-controlled; authorization must come from the authenticated session, not from where the request claims to originate.",
  status: 'vulnerable',

  createRouter(SQL, ctx) {
    const db = shared.seedUsers(SQL);
    const r = express.Router();

    const internal = (req) =>
      (req.headers['x-forwarded-for'] || '').split(',').some((ip) => ip.trim() === '127.0.0.1');   //! trusts a client-set X-Forwarded-For header to decide "internal" (admin) access

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.dashboard() })));

    r.get('/admin', (req, res) => {
      if (!internal(req)) return res.send(shared.stagePage(ctx, { result: shared.deniedBanner() }));
      res.send(shared.stagePage(ctx, { result: shared.adminPanel(ctx.mount, db), success: true }));
    });

    r.post('/admin/promote', (req, res) => {
      if (!internal(req)) return res.send(shared.stagePage(ctx, { result: shared.deniedBanner() }));
      const role = shared.promote(db, req.body.user || 'alice');
      const result = `<div class="card">✅ ${shared.escapeHtml(req.body.user || 'alice')} is now <strong>${role}</strong>.</div>`
        + shared.adminPanel(ctx.mount, db);
      res.send(shared.stagePage(ctx, { result, success: true }));
    });

    return r;
  },
};
