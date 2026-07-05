'use strict';

// Stage 2 — a plausible "email" validator with a nested quantifier in the local part.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 2,
  slug: 'email-regex',
  title: 'Nested quantifier in an email regex',
  defense: 'An email-style regex ([a-z0-9]+)*@…',
  hint: "The local-part pattern <code>([a-z0-9]+)*</code> is a nested quantifier hiding in a real-looking email regex. Include an <code>@</code> so the engine commits, then a wrong domain to force backtracking — a long local part like <code>aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@x</code>.",
  lesson: 'Real-world regexes (emails, URLs) often smuggle in nested quantifiers — the danger isn’t obvious.',
  explanation:
    "<code>([a-z0-9]+)*</code> has the same exponential structure as <code>(a+)+</code>; once the <code>@</code> is consumed, the failing domain forces the engine to explore every split of the local part. Prefer simple, linear patterns and validate structure differently.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const RE = /^([a-z0-9]+)*@example\.com$/;   //! nested quantifier ([a-z0-9]+)* — exponential backtracking when the @ never matches
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.validateForm(ctx) })));
    r.post('/validate', (req, res) => {
      const input = req.body.input || '';
      const { ms, matched } = shared.timeRegex(RE, input);
      res.send(shared.stagePage(ctx, { content: shared.validateForm(ctx, input) + shared.timingPanel(ms, matched), success: ms > shared.THRESHOLD_MS }));
    });
    return r;
  },
};
