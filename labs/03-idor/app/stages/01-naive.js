'use strict';

// Stage 1 — view an invoice by the id in the URL.

const express = require('express');
const shared = require('../shared');

const ME = 1; // the authenticated user is alice (id 1) — from the session

module.exports = {
  stage: 1,
  slug: 'naive',
  title: 'Direct id, no check',
  defense: 'None — any invoice id is returned.',
  hint: "Your invoice link has the id right in the URL: <code>/invoice/101</code>. The ids are sequential. What's at <code>/invoice/102</code>?",
  lesson: 'Fetching an object by id is not permission to read it; without an ownership check, ids are just a directory of everyone\'s data.',
  explanation:
    "The handler fetched the invoice purely by the id in the URL and returned it — it never checked whether the invoice belongs to <em>you</em> (alice). " +
    "Changing the id walked straight into another user's record. That's an Insecure Direct Object Reference.",
  status: 'vulnerable',

  createRouter(SQL, ctx) {
    const db = shared.seedInvoices(SQL);
    const r = express.Router();

    r.get('/', (req, res) => {
      const links = shared.myInvoices(db, ME)
        .map((i) => `<li><a href="${ctx.mount}/invoice/${i.id}">Invoice #${i.id}</a> — ${shared.escapeHtml(i.note)}</li>`)
        .join('');
      res.send(shared.stagePage(ctx, {
        content: `<p>Your invoices, alice:</p><ul>${links}</ul>
          <p class="hint">The id is right there in the URL…</p>`,
      }));
    });

    r.get('/invoice/:id', (req, res) => {
      const inv = shared.getInvoice(db, req.params.id);   //! no ownership check — the invoice is returned for ANY id, regardless of who you are
      const result = inv ? shared.invoiceCard(inv) : `<p class="banner">No such invoice.</p>`;
      const success = !!inv && inv.owner_id !== ME;
      res.send(shared.stagePage(ctx, { content: '', result, success }));
    });

    return r;
  },
};
