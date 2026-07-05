'use strict';

// Stage 5 — an idempotency key is recorded, but the has-then-add straddles an await.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 5,
  slug: 'idempotency-key',
  title: 'Non-atomic idempotency check',
  defense: 'An idempotency-key set to dedupe requests.',
  hint: "Requests carry an idempotency <code>key</code>, checked against a seen-set. But the set is checked, then added to only after the await. Send many concurrent requests with the <em>same</em> key.",
  lesson: 'Checking then recording an idempotency key across an await isn’t atomic — identical concurrent keys all pass.',
  explanation:
    "All requests shared one key; each checked <code>seen.has(key) === false</code> before any <code>seen.add(key)</code>. Record the key atomically (a unique DB insert) so the second request fails.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const st = { granted: 0, seen: new Set() };
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.statusCard(ctx, st.granted), success: st.granted > 1 })));
    r.get('/status', (req, res) => res.json({ granted: st.granted }));
    r.post('/reset', (req, res) => { st.granted = 0; st.seen = new Set(); res.json({ ok: true }); });
    r.post('/claim', async (req, res) => {
      const key = req.body.key || '';
      if (st.seen.has(key)) return res.json({ granted: st.granted });
      await shared.delay(25); st.seen.add(key); st.granted++;   //! checks the idempotency key, awaits, then records it — concurrent identical keys all pass
      res.json({ granted: st.granted });
    });
    return r;
  },
};
