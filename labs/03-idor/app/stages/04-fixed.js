'use strict';

// Stage 4 — the secure version: one ownership check applied on every route.

const express = require('express');
const shared = require('../shared');

const ME = 1; // alice, from the session

module.exports = {
  stage: 4,
  slug: 'fixed',
  title: 'Per-object authorization',
  defense: 'Ownership is enforced on every route, deny by default.',
  hint: '',
  lesson: 'Authorize each object access against the authenticated user, centrally, on every path — deny by default.',
  explanation:
    "Both the view and the print routes go through the same <code>authorize()</code> check: the invoice is returned only if its <code>owner_id</code> matches the authenticated user. " +
    "Ids and tokens no longer matter — guessing or encoding another user's id just yields “access denied”, because permission is decided by who you are, not by which id you asked for.",
  status: 'secure',

  createRouter(SQL, ctx) {
    const db = shared.seedInvoices(SQL);
    const r = express.Router();

    // Authorization helper used by every route.
    const authorize = (id) => {
      const inv = shared.getInvoice(db, id);
      return inv && inv.owner_id === ME ? inv : null;   //! single ownership check enforced on EVERY route — deny by default
    };

    r.get('/', (req, res) => {
      const links = shared.myInvoices(db, ME)
        .map((i) => `<li><a href="${ctx.mount}/invoice/${i.id}">Invoice #${i.id}</a> · <a href="${ctx.mount}/invoice/${i.id}/print">print</a></li>`)
        .join('');
      res.send(shared.stagePage(ctx, {
        content: `<p>Your invoices, alice:</p><ul>${links}</ul>
          <p class="hint">Try another user's id on either route — view or print.</p>`,
      }));
    });

    r.get('/invoice/:id', (req, res) => {
      const inv = authorize(req.params.id);
      res.send(shared.stagePage(ctx, { result: inv ? shared.invoiceCard(inv) : shared.deniedBanner(req.params.id) }));
    });

    r.get('/invoice/:id/print', (req, res) => {
      const inv = authorize(req.params.id);
      res.send(shared.stagePage(ctx, { result: inv ? shared.invoiceCard(inv) : shared.deniedBanner(req.params.id) }));
    });

    return r;
  },
};
