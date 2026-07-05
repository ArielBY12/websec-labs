'use strict';

// Stage 4 — a length cap is added, but it's far too high to prevent ReDoS.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 4,
  slug: 'length-cap',
  title: 'Length cap that’s too high',
  defense: 'A nested-quantifier regex, but inputs are capped at 40 chars.',
  hint: "There's a length cap of 40 now — but exponential backtracking blows up well under that. About 30 characters is already catastrophic: <code>xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx!</code>.",
  lesson: 'A length cap isn’t a ReDoS defense unless it’s tiny — exponential blowup happens at a few dozen characters.',
  explanation:
    "With exponential backtracking, ~30 characters already means hundreds of millions of steps, so a 40-char cap does nothing. Fix the regex itself; caps only help against linear/polynomial cost.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const RE = /^(x+)+$/;
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.validateForm(ctx) })));
    r.post('/validate', (req, res) => {
      const input = req.body.input || '';
      if (input.length > 40)   //! a length cap of 40 is far too high — 30 chars already backtrack exponentially against (x+)+
        return res.send(shared.stagePage(ctx, { content: shared.validateForm(ctx, input), result: shared.deniedBanner('⛔ Input too long (max 40).') }));
      const { ms, matched } = shared.timeRegex(RE, input);
      res.send(shared.stagePage(ctx, { content: shared.validateForm(ctx, input) + shared.timingPanel(ms, matched), success: ms > shared.THRESHOLD_MS }));
    });
    return r;
  },
};
