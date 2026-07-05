'use strict';

// Stage 6 — the fix: a linear regex (no nested quantifiers) plus a sane input bound.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 6,
  slug: 'fixed',
  title: 'Linear regex + input bound',
  defense: 'A non-backtracking pattern with a small length bound.',
  hint: '',
  lesson: 'Avoid nested quantifiers and ambiguous alternations; use linear patterns (and bound input length / use a linear engine like RE2).',
  explanation:
    "The pattern has no quantifier nested inside another and no ambiguous alternation, so matching is linear in the input length — the same 30-<code>a</code> payload finishes in microseconds. A modest length bound and, ideally, a linear regex engine (RE2) are belt-and-suspenders.",
  status: 'secure',

  createRouter(ctx) {
    const r = express.Router();
    const RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]+$/i;   //! linear pattern — no nested quantifier or ambiguous alternation, so no catastrophic backtracking
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.validateForm(ctx, 'alice@example.com') })));
    r.post('/validate', (req, res) => {
      const input = req.body.input || '';
      if (input.length > 254)
        return res.send(shared.stagePage(ctx, { content: shared.validateForm(ctx, input), result: shared.deniedBanner('⛔ Input too long.') }));
      const { ms, matched } = shared.timeRegex(RE, input);
      res.send(shared.stagePage(ctx, { content: shared.validateForm(ctx, input) + shared.timingPanel(ms, matched), success: ms > shared.THRESHOLD_MS }));
    });
    return r;
  },
};
