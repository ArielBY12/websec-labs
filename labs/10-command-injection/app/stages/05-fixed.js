'use strict';

// Stage 5 — the fix: no shell. The host is passed as a single argument to the
// program, so metacharacters have no special meaning.

const express = require('express');
const { execFile } = require('child_process');
const shared = require('../shared');

module.exports = {
  stage: 5,
  slug: 'fixed',
  title: 'No shell — argument vector',
  defense: 'Passes the host as an argv element to execFile (no shell).',
  hint: '',
  lesson: 'Run the program directly with an argument array (execFile/spawn, shell:false) so user input can never be parsed as shell syntax.',
  explanation:
    "With <code>execFile</code> the host is one element of <code>argv</code> handed straight to the program — there is no shell to interpret <code>;</code>, <code>$()</code>, quotes, or anything else, so every earlier payload becomes a harmless literal string. Validate/allowlist too, but not invoking a shell is what removes the bug class.",
  status: 'secure',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.toolForm(ctx) })));
    r.post('/lookup', (req, res) => {
      const host = req.body.host || '';
      execFile('echo', ['Looking up', host], { timeout: 3000 }, (e, stdout, stderr) => {   //! host is a single argv element passed to the program — no shell parses it
        const out = `${stdout || ''}${stderr || ''}`;
        res.send(shared.stagePage(ctx, { content: shared.toolForm(ctx, host) + shared.outputPanel(out) }));
      });
    });
    return r;
  },
};
