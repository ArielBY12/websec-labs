'use strict';

// Stage 4 — the host is wrapped in double quotes and $()/backticks are stripped, so
// substitution is dead and the value looks "contained".

const express = require('express');
const { exec } = require('child_process');
const shared = require('../shared');

module.exports = {
  stage: 4,
  slug: 'quoted-arg',
  title: 'Quoted argument',
  defense: 'Wraps the host in double quotes; strips $ and backticks.',
  hint: "Your value sits inside <code>\"…\"</code> now and substitution characters are stripped. But a double quote isn't an escape — you can simply <em>close</em> it: <code>127.0.0.1\"; id; echo \"</code>.",
  lesson: 'Wrapping a value in quotes inside a shell string is not escaping — the value can close the quote and break out.',
  explanation:
    "Double quotes only delay the problem: your <code>\"</code> ended the quoted argument, then <code>;</code> started <code>id</code>. Proper escaping of every shell metacharacter is error-prone; the real fix is to not use a shell at all.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.toolForm(ctx) })));
    r.post('/lookup', (req, res) => {
      const host = String(req.body.host || '').replace(/[$`]/g, '');   // kill command substitution
      const cmd = `echo "Looking up ${host}"`;   //! wrapping the value in double quotes doesn't escape it — a " closes the quote and breaks out
      exec(cmd, { timeout: 3000 }, (e, stdout, stderr) => {
        const out = `${stdout || ''}${stderr || ''}`;
        res.send(shared.stagePage(ctx, { content: shared.toolForm(ctx, req.body.host || '') + shared.outputPanel(out), success: shared.looksInjected(out) }));
      });
    });
    return r;
  },
};
