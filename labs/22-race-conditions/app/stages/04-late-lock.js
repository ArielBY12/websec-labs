'use strict';

// Stage 4 — a "busy" lock, but it's acquired only after the await.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 4,
  slug: 'late-lock',
  title: 'Lock acquired too late',
  defense: 'A busy lock around the claim.',
  hint: "There's a lock now — but it's checked, then set only <em>after</em> the awaited work. The check-then-set isn't atomic, so concurrent requests all see the lock free.",
  lesson: 'Acquiring a lock after yielding leaves the check-then-set window open — the lock must be taken atomically before any await.',
  explanation:
    "Each request saw <code>busy === false</code>, awaited, then set the lock and committed. A lock only works if it's acquired atomically before the first <code>await</code>. Set it synchronously up front.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const st = { granted: 0, busy: false };
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.statusCard(ctx, st.granted), success: st.granted > 1 })));
    r.get('/status', (req, res) => res.json({ granted: st.granted }));
    r.post('/reset', (req, res) => { st.granted = 0; st.busy = false; res.json({ ok: true }); });
    r.post('/claim', async (req, res) => {
      if (st.busy) return res.json({ granted: st.granted });
      await shared.delay(25); st.busy = true; st.granted++; st.busy = false;   //! the lock is checked, then set only AFTER the await — the check-then-set window lets everyone in
      res.json({ granted: st.granted });
    });
    return r;
  },
};
