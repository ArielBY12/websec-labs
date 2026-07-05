'use strict';

// Stage 1 — the one-time bonus has no guard at all.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 1,
  slug: 'no-guard',
  title: 'No guard',
  defense: 'None — every claim grants the bonus.',
  hint: "There's nothing stopping repeat claims. Fire many <code>POST /claim</code> requests at once and the count climbs past 1.",
  lesson: 'A one-time action with no guard is trivially repeatable — concurrently or not.',
  explanation:
    "Each request simply granted the bonus. Guard one-time actions with an atomic check-and-set (or a unique DB constraint / transaction).",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const st = { granted: 0 };
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.statusCard(ctx, st.granted), success: st.granted > 1 })));
    r.get('/status', (req, res) => res.json({ granted: st.granted }));
    r.post('/reset', (req, res) => { st.granted = 0; res.json({ ok: true }); });
    r.post('/claim', async (req, res) => {
      await shared.delay(25); st.granted++;   //! no guard — every concurrent request grants the bonus
      res.json({ granted: st.granted });
    });
    return r;
  },
};
