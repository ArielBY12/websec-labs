'use strict';

// Stage 2 — a filter rejects the semicolon.

const express = require('express');
const { exec } = require('child_process');
const shared = require('../shared');

module.exports = {
  stage: 2,
  slug: 'block-semicolon',
  title: 'Semicolon blacklist',
  defense: 'Rejects the host if it contains ";".',
  hint: "The semicolon is blocked, but it's far from the only way to chain commands. Shells also have <code>&amp;&amp;</code>, <code>||</code>, and <code>|</code>. Try <code>127.0.0.1 &amp;&amp; id</code>.",
  lesson: 'Blacklisting one metacharacter ignores the many other shell operators that chain commands.',
  explanation:
    "Only <code>;</code> was blocked, so <code>&amp;&amp;</code> ran <code>id</code> after the lookup. Command chaining has many forms (<code>&amp;&amp;</code>, <code>||</code>, <code>|</code>, newlines, <code>$()</code>); enumerating bad characters never ends.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.toolForm(ctx) })));
    r.post('/lookup', (req, res) => {
      const host = req.body.host || '';
      if (host.includes(';'))   //! blacklists only ";" — && || | and $() still chain commands
        return res.send(shared.stagePage(ctx, { content: shared.toolForm(ctx, host), result: shared.deniedBanner('⛔ ";" is not allowed.') }));
      exec(`echo Looking up ${host}`, { timeout: 3000 }, (e, stdout, stderr) => {
        const out = `${stdout || ''}${stderr || ''}`;
        res.send(shared.stagePage(ctx, { content: shared.toolForm(ctx, host) + shared.outputPanel(out), success: shared.looksInjected(out) }));
      });
    });
    return r;
  },
};
