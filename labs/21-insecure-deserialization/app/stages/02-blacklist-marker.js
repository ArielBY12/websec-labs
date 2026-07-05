'use strict';

// Stage 2 — the marker is blacklisted in the serialized string, before JSON decoding.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 2,
  slug: 'blacklist-marker',
  title: 'Blacklist on the serialized bytes',
  defense: 'Rejects the token if it contains the function marker.',
  hint: "It scans the raw token for <code>_$$ND_FUNC$$_</code> — but JSON lets you write characters as <code>\\uXXXX</code> escapes. Encode part of the marker (e.g. the leading underscore as <code>\\u005f</code>) so the raw string doesn't contain it, but the parsed value does.",
  lesson: 'Filtering the serialized bytes is not filtering the parsed value — escapes/encodings rebuild the payload after parsing.',
  explanation:
    "The blacklist ran on the pre-parse text, but <code>\\u005f</code> only becomes <code>_</code> after <code>JSON.parse</code>, so the reviver still saw the marker and eval'd. Validate the deserialized value/behavior, not the input string — better, don't eval at all.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.tokenForm(ctx) })));
    r.post('/restore', (req, res) => {
      const token = req.body.token || '{}';
      if (String(token).includes(shared.MARKER))   //! blacklists the marker in the serialized string — \uXXXX escapes rebuild it after JSON.parse
        return res.send(shared.stagePage(ctx, { content: shared.tokenForm(ctx, token), result: shared.deniedBanner('⛔ Function markers are not allowed.') }));
      let obj;
      try { obj = shared.unserialize(token, { functions: true }); }
      catch (e) { return res.send(shared.stagePage(ctx, { content: shared.tokenForm(ctx, token), result: shared.deniedBanner('⛔ ' + e.message) })); }
      res.send(shared.stagePage(ctx, { content: shared.tokenForm(ctx, token) + shared.resultPanel(obj), success: shared.deserLeaked(JSON.stringify(obj)) }));
    });
    return r;
  },
};
