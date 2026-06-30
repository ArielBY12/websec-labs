'use strict';

// Stage 5 — a path-based guard blocks /admin* for non-admins; the app also resolves
// the page to serve from an X-Original-URL header.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 5,
  slug: 'url-override',
  title: 'Front-end path check, back-end URL override',
  defense: 'Blocks /admin* for non-admins based on the request path.',
  hint: "Requesting <code>/admin</code> directly is blocked by a path-based guard. But some back-ends honour an <code>X-Original-URL</code> header (set by a front proxy) and serve <em>that</em> path instead — one the guard never inspected. Try requesting <code>/</code> with <code>X-Original-URL: /admin</code>.",
  lesson: 'When the gateway authorizes one URL but the app resolves another (e.g. from X-Original-URL), they disagree — authorize on the actual, normalized path the app will serve.',
  explanation:
    "The guard inspected <code>req.path</code> (here, <code>/</code>) and allowed the request. But the handler resolved the page from the <code>X-Original-URL</code> header — <code>/admin</code> — which the guard never saw. " +
    "Front-end access control on one URL plus back-end routing on another is a classic mismatch; decide access on the path that is actually served.",
  status: 'vulnerable',

  createRouter(SQL, ctx) {
    const db = shared.seedUsers(SQL);
    const r = express.Router();

    // Path-based guard for the admin area.
    r.use((req, res, next) => {
      if (req.path.startsWith('/admin') && shared.SESSION.role !== 'admin') {
        return res.send(shared.stagePage(ctx, { result: shared.deniedBanner() }));
      }
      next();
    });

    r.get('/', (req, res) => {
      const orig = req.headers['x-original-url'];   //! the back-end serves the path from the X-Original-URL header, which the path-based guard never inspected
      if (orig && orig.startsWith('/admin')) {
        return res.send(shared.stagePage(ctx, { result: shared.adminPanel(ctx.mount, db), success: true }));
      }
      res.send(shared.stagePage(ctx, { content: shared.dashboard() }));
    });

    // Direct admin routes exist but are gated by the guard above.
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
