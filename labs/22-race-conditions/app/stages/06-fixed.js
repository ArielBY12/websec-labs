'use strict';

// Stage 6 — the fix: an atomic check-and-set before any await.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 6,
  slug: 'fixed',
  title: 'Atomic check-and-set',
  defense: 'Sets the guard synchronously before any async work.',
  hint: '',
  lesson: 'Take the guard atomically before yielding: check-and-set in the same synchronous tick (or use a DB transaction / unique constraint / conditional UPDATE).',
  explanation:
    "The <code>claimed</code> flag is set in the same synchronous tick as the check, before any <code>await</code> — so the second concurrent request already sees it set and stops. Node's single-threaded event loop makes a synchronous check-and-set atomic; in a real DB, use a transaction or a unique constraint. The bonus is granted exactly once.",
  status: 'secure',

  createRouter(ctx) {
    const r = express.Router();
    const st = { granted: 0, claimed: false };
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.statusCard(ctx, st.granted) })));
    r.get('/status', (req, res) => res.json({ granted: st.granted }));
    r.post('/reset', (req, res) => { st.granted = 0; st.claimed = false; res.json({ ok: true }); });
    r.post('/claim', async (req, res) => {
      if (st.claimed) return res.json({ granted: st.granted });
      st.claimed = true;   //! set the guard synchronously BEFORE any await (atomic check-and-set) — concurrent requests serialize
      await shared.delay(25); st.granted++;
      res.json({ granted: st.granted });
    });
    return r;
  },
};
