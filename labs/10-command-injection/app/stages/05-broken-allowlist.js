'use strict';

// Stage 5 — an allowlist regex is meant to permit only hostname characters, but it
// isn't anchored, so it matches any string that merely contains one.

const express = require('express');
const { exec } = require('child_process');
const shared = require('../shared');

module.exports = {
  stage: 5,
  slug: 'broken-allowlist',
  title: 'Unanchored allowlist',
  defense: 'Requires the host to match a hostname character class.',
  hint: "This looks strict — it checks the host against <code>[a-zA-Z0-9.-]</code>. But the regex has no anchors, so <code>.test()</code> is true if the string <em>contains</em> any valid character. <code>127.0.0.1; id</code> passes the check.",
  lesson: 'An allowlist regex without ^…$ anchors validates “contains a good char”, not “is all good chars” — no validation at all.',
  explanation:
    "The pattern matched a substring, so any input with a single letter or digit passed and reached the shell. Allowlists must be anchored (<code>^[a-zA-Z0-9.-]+$</code>) and reject the whole input if any character is invalid — and even then, don't build a shell string.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.toolForm(ctx) })));
    r.post('/lookup', (req, res) => {
      const host = req.body.host || '';
      if (!/[a-zA-Z0-9.-]/.test(host))   //! unanchored regex — .test() is true if the host CONTAINS a valid char, not if it's entirely valid
        return res.send(shared.stagePage(ctx, { content: shared.toolForm(ctx, host), result: shared.deniedBanner('⛔ Invalid host.') }));
      exec(`echo Looking up ${host}`, { timeout: 3000 }, (e, stdout, stderr) => {
        const out = `${stdout || ''}${stderr || ''}`;
        res.send(shared.stagePage(ctx, { content: shared.toolForm(ctx, host) + shared.outputPanel(out), success: shared.looksInjected(out) }));
      });
    });
    return r;
  },
};
