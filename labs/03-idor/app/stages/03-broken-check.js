'use strict';

// Stage 3 — a real ownership check is finally added… on the main invoice page.
// But the printable/export route was added separately and never got the same
// guard. The object is reachable through more than one path, and only one is
// protected.

const express = require('express');
const shared = require('../shared');

const ME = 1; // alice, from the session

module.exports = {
  stage: 3,
  slug: 'broken-check',
  title: 'Check on the page, not the export',
  defense: 'Ownership is checked on the main invoice route.',
  hint: "The invoice page now refuses ids that aren't yours — good. But this app also lets you <em>print</em> an invoice. Is the print/export route guarded the same way? Try adding <code>/print</code>.",
  lesson: 'Authorization must be enforced on every path to the object — a second route that returns the same data needs the same check.',
  explanation:
    "The main route <code>/invoice/:id</code> correctly rejected invoices that aren't yours. But the <code>/invoice/:id/print</code> route was added later and returns the same record <em>without</em> the ownership check. " +
    "Attackers don't use your intended path — they find the one route you forgot to guard.",
  status: 'vulnerable',

  createRouter(SQL, ctx) {
    const db = shared.seedInvoices(SQL);
    const r = express.Router();

    r.get('/', (req, res) => {
      const links = shared.myInvoices(db, ME)
        .map((i) => `<li><a href="${ctx.mount}/invoice/${i.id}">Invoice #${i.id}</a> · <a href="${ctx.mount}/invoice/${i.id}/print">print</a></li>`)
        .join('');
      res.send(shared.stagePage(ctx, {
        content: `<p>Your invoices, alice — view or print:</p><ul>${links}</ul>
          <p class="hint">The view route is guarded now. Every route?</p>`,
      }));
    });

    // Main route — properly checks ownership.
    r.get('/invoice/:id', (req, res) => {
      const inv = shared.getInvoice(db, req.params.id);
      if (!inv || inv.owner_id !== ME) {
        return res.send(shared.stagePage(ctx, { result: shared.deniedBanner(req.params.id) }));
      }
      res.send(shared.stagePage(ctx, { result: shared.invoiceCard(inv) }));
    });

    // Printable view — added later, returns the same data with no check.
    r.get('/invoice/:id/print', (req, res) => {
      const inv = shared.getInvoice(db, req.params.id);   //! the print/export route returns the invoice without the ownership check the main route has
      const result = inv ? shared.invoiceCard(inv) : `<p class="banner">No such invoice.</p>`;
      const success = !!inv && inv.owner_id !== ME;
      res.send(shared.stagePage(ctx, { result, success }));
    });

    return r;
  },
};
