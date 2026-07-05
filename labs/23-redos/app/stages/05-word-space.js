'use strict';

// Stage 5 — a "trim/normalize" style regex with a nested quantifier over \w and \s.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 5,
  slug: 'word-space',
  title: 'Nested quantifier over \\w and \\s',
  defense: 'A whitespace-normalizing regex (\\w+\\s*)*.',
  hint: "The pattern <code>(\\w+\\s*)*</code> nests <code>\\w+</code> inside a <code>*</code>. A long run of word characters ending in a symbol backtracks catastrophically: <code>aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!</code>.",
  lesson: 'Character-class nested quantifiers ((\\w+\\s*)*) are just as exponential as (a+)+.',
  explanation:
    "<code>\\w+</code> inside the outer <code>*</code> creates the same ambiguous splitting; the trailing <code>!</code> (neither <code>\\w</code> nor <code>\\s</code>) forces the engine to exhaust every division. Use a linear pattern such as <code>/^[\\w\\s]+$/</code>.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const RE = /^(\w+\s*)*$/;   //! nested quantifier over character classes (\w+\s*)* — exponential backtracking on a non-matching suffix
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.validateForm(ctx) })));
    r.post('/validate', (req, res) => {
      const input = req.body.input || '';
      const { ms, matched } = shared.timeRegex(RE, input);
      res.send(shared.stagePage(ctx, { content: shared.validateForm(ctx, input) + shared.timingPanel(ms, matched), success: ms > shared.THRESHOLD_MS }));
    });
    return r;
  },
};
