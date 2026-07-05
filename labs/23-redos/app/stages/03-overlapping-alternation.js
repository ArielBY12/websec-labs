'use strict';

// Stage 3 — an overlapping alternation inside a quantifier.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 3,
  slug: 'overlapping-alternation',
  title: 'Overlapping alternation (a|a)*',
  defense: 'An alternation regex (a|a)*.',
  hint: "The pattern <code>(a|a)*</code> has two branches that match the <em>same</em> character, so each <code>a</code> can be consumed two ways — exponentially many combinations. A run of <code>a</code>s ending in a mismatch triggers it: <code>aaaaaaaaaaaaaaaaaaaaaaa!</code>.",
  lesson: 'Alternations whose branches overlap (match the same input) cause exponential backtracking.',
  explanation:
    "Because both branches of <code>(a|a)</code> match <code>a</code>, the engine tries every way to divide the run of <code>a</code>s before the trailing <code>!</code> fails the match. Make alternatives mutually exclusive and avoid ambiguity.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const RE = /^(a|a)*$/;   //! overlapping alternation (a|a)* — both branches match the same char, so matches backtrack exponentially
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.validateForm(ctx) })));
    r.post('/validate', (req, res) => {
      const input = req.body.input || '';
      const { ms, matched } = shared.timeRegex(RE, input);
      res.send(shared.stagePage(ctx, { content: shared.validateForm(ctx, input) + shared.timingPanel(ms, matched), success: ms > shared.THRESHOLD_MS }));
    });
    return r;
  },
};
