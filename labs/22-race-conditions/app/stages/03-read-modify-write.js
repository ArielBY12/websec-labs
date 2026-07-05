'use strict';

// Stage 3 — a "uses remaining" counter, decremented with a read-modify-write gap.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 3,
  slug: 'read-modify-write',
  title: 'Non-atomic read-modify-write',
  defense: 'A remaining-uses counter (starts at 1).',
  hint: "A counter tracks remaining uses. But it's read, then (after an await) decremented — a classic non-atomic read-modify-write. Concurrent requests all read <code>uses &gt; 0</code>.",
  lesson: 'Read-modify-write across an await isn’t atomic — concurrent readers all see the old value.',
  explanation:
    "Every request read <code>uses === 1</code> before any decrement landed, so all of them proceeded. Use an atomic decrement / conditional update (e.g. <code>UPDATE … WHERE uses &gt; 0</code>) instead of read-then-write.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const st = { granted: 0, uses: 1 };
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.statusCard(ctx, st.granted), success: st.granted > 1 })));
    r.get('/status', (req, res) => res.json({ granted: st.granted }));
    r.post('/reset', (req, res) => { st.granted = 0; st.uses = 1; res.json({ ok: true }); });
    r.post('/claim', async (req, res) => {
      if (st.uses > 0) { await shared.delay(25); st.uses--; st.granted++; }   //! reads the counter, awaits, then decrements — concurrent requests all read uses > 0
      res.json({ granted: st.granted });
    });
    return r;
  },
};
