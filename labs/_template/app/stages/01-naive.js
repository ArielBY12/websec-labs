'use strict';

const express = require('express');
const shared = require('../shared');

// Standard depth is 3 vulnerable stages + 1 fixed. Start with this naive stage,
// then use the `new-stage` skill to add 02 and 03 (each a stronger but still
// bypassable defense), keeping `fixed` last.
//
// Spoiler policy: mark the security-relevant line with a trailing `//!` comment.
// The app strips that text but highlights the line; `hint` (button) and
// `explanation` (after success) carry the teaching content.

module.exports = {
  stage: 1,
  slug: 'naive',
  title: 'Naive implementation',
  defense: 'None — the baseline, unguarded version.',
  hint: 'TODO: a nudge toward the flaw — not the full payload.',
  lesson: 'TODO: the one-line takeaway for the recap table.',
  explanation: 'TODO: the detailed "why it worked", revealed after a success. HTML allowed.',
  status: 'vulnerable',

  createRouter(SQL, ctx) {
    const r = express.Router();

    r.get('/', (req, res) =>
      res.send(shared.stagePage(ctx, { content: '<p>TODO: build the vulnerable feature here.</p>' }))
    );

    r.post('/action', (req, res) => {
      const { input = '' } = req.body;
      const used = input;   //! VULNERABLE: TODO — use `input` in the unsafe way this lab teaches
      const result = `<pre>${shared.escapeHtml(used)}</pre>`;
      res.send(shared.stagePage(ctx, { content: '', result }));
    });

    return r;
  },
};
