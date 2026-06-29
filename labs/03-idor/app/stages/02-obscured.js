'use strict';

// Stage 2 — first fix attempt: stop exposing sequential ids. The invoice id is
// handed out as an "opaque" base64 token, on the assumption that nobody can guess
// another user's token. But the token still carries the id, and there's still no
// ownership check.

const express = require('express');
const shared = require('../shared');

const ME = 1; // alice, from the session
const tokenFor = (id) => Buffer.from(String(id)).toString('base64');

module.exports = {
  stage: 2,
  slug: 'obscured',
  title: '"Unguessable" encoded id',
  defense: 'Ids are handed out as base64-encoded tokens.',
  hint: "Your link is now <code>/invoice/MTAx</code> instead of <code>/invoice/101</code>. That token isn't random — it's <em>encoded</em>. What does <code>MTAx</code> decode to? Can you encode someone else's id the same way?",
  lesson: 'Obscurity is not access control: an encoded or random id only delays enumeration — it never proves you may read the object.',
  explanation:
    "The token was just base64 of the id (<code>MTAx</code> → <code>101</code>). Decoding your own, changing the number, and re-encoding produced a valid token for another user's invoice — and the handler still never checked ownership. " +
    "Making identifiers hard to guess is not authorization.",
  status: 'vulnerable',

  createRouter(SQL, ctx) {
    const db = shared.seedInvoices(SQL);
    const r = express.Router();

    r.get('/', (req, res) => {
      const links = shared.myInvoices(db, ME)
        .map((i) => `<li><a href="${ctx.mount}/invoice/${tokenFor(i.id)}">Invoice #${i.id}</a> — ${shared.escapeHtml(i.note)}</li>`)
        .join('');
      res.send(shared.stagePage(ctx, {
        content: `<p>Your invoices, alice (now with opaque tokens):</p><ul>${links}</ul>
          <p class="hint">The token replaces the raw id… but where did it come from?</p>`,
      }));
    });

    r.get('/invoice/:token', (req, res) => {
      const id = Number(Buffer.from(req.params.token, 'base64').toString('utf8'));   //! the "opaque" token is just reversible base64 — and still no ownership check follows
      const inv = shared.getInvoice(db, id);
      const result = inv ? shared.invoiceCard(inv) : `<p class="banner">No such invoice.</p>`;
      const success = !!inv && inv.owner_id !== ME;
      res.send(shared.stagePage(ctx, { content: '', result, success }));
    });

    return r;
  },
};
