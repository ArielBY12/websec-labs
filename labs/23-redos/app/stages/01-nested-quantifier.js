'use strict';

// Stage 1 — the classic nested quantifier (a+)+.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 1,
  slug: 'nested-quantifier',
  title: 'Nested quantifier (a+)+',
  defense: 'None — a nested-quantifier regex.',
  hint: "The validator uses <code>/^(a+)+$/</code>. A run of <code>a</code>s that ends with a non-<code>a</code> forces exponential backtracking. Try 30-ish <code>a</code>s then <code>!</code>: <code>aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!</code>.",
  lesson: 'A quantifier inside another quantifier (a+)+ backtracks exponentially on a non-matching suffix.',
  explanation:
    "There are exponentially many ways to split the <code>a</code>s between the inner and outer <code>+</code>, and the trailing <code>!</code> forces the engine to try them all before failing. Rewrite without nested quantifiers (e.g. <code>/^a+$/</code>).",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const RE = /^(a+)+$/;   //! nested quantifier — exponential backtracking on a long run of 'a' followed by a non-'a'
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.validateForm(ctx) })));
    r.post('/validate', (req, res) => {
      const input = req.body.input || '';
      const { ms, matched } = shared.timeRegex(RE, input);
      res.send(shared.stagePage(ctx, { content: shared.validateForm(ctx, input) + shared.timingPanel(ms, matched), success: ms > shared.THRESHOLD_MS }));
    });
    return r;
  },
};
