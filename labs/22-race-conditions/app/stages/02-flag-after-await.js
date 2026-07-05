'use strict';

// Stage 2 — a "claimed" flag guards the bonus, but it's set after the async work.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 2,
  slug: 'flag-after-await',
  title: 'Flag set after the await',
  defense: 'A claimed flag — set once the credit is applied.',
  hint: "There's a <code>claimed</code> flag now, but it's only set <em>after</em> the (awaited) credit step. Concurrent requests all check it before any of them sets it. Fire them together.",
  lesson: 'A guard set after an await doesn’t exist during the window — every concurrent request passes the check first.',
  explanation:
    "All requests read <code>claimed === false</code>, awaited, then each credited and set the flag. The check and the state change straddled an <code>await</code>, so they weren't atomic. Set the guard before yielding.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const st = { granted: 0, claimed: false };
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.statusCard(ctx, st.granted), success: st.granted > 1 })));
    r.get('/status', (req, res) => res.json({ granted: st.granted }));
    r.post('/reset', (req, res) => { st.granted = 0; st.claimed = false; res.json({ ok: true }); });
    r.post('/claim', async (req, res) => {
      if (!st.claimed) { await shared.delay(25); st.granted++; st.claimed = true; }   //! the "claimed" flag is set AFTER the await — concurrent requests all saw it unset
      res.json({ granted: st.granted });
    });
    return r;
  },
};
