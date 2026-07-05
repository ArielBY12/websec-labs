'use strict';

// Stage 2 — the merge blacklists "role", but the privileged field is isAdmin.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 2,
  slug: 'wrong-field',
  title: 'Blacklists the wrong field',
  defense: 'Deletes body.role before merging.',
  hint: "It strips <code>role</code> now — but that's not the field that grants access here. Look at your account object for the boolean that does: <code>{\"isAdmin\":true}</code>.",
  lesson: 'A blacklist must cover every privileged field — miss one (isAdmin) and the guard is pointless.',
  explanation:
    "Only <code>role</code> was deleted, but admin is decided by <code>isAdmin</code>, which sailed through. Denylisting individual fields is fragile; allowlist the editable ones instead.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const user = { name: 'Alice', email: 'alice@bank.example', bio: 'hi', isAdmin: false };
    const isAdmin = (u) => u.isAdmin === true;
    const render = () => ({ content: shared.profileForm(ctx) + shared.profilePanel(user, isAdmin(user)), success: isAdmin(user) });

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, render())));
    r.post('/update', (req, res) => {
      let patch; try { patch = JSON.parse(req.body.data || '{}'); } catch { return res.send(shared.stagePage(ctx, { content: shared.profileForm(ctx, req.body.data), result: shared.deniedBanner('⛔ Invalid JSON.') })); }
      delete patch.role;   //! blacklists only "role" — the privileged field here is isAdmin, which still gets assigned
      Object.assign(user, patch);
      res.send(shared.stagePage(ctx, render()));
    });
    return r;
  },
};
