'use strict';

// Stage 3 — the filter now rejects the chaining operators and newlines.

const express = require('express');
const { exec } = require('child_process');
const shared = require('../shared');

module.exports = {
  stage: 3,
  slug: 'block-operators',
  title: 'Operator blacklist',
  defense: 'Rejects ; | & and newlines.',
  hint: "Chaining operators are gone, but you don't need to chain — you can <em>substitute</em>. Command substitution runs a command and pastes its output inline: <code>127.0.0.1$(id)</code>.",
  lesson: 'Command substitution ($()/backticks) executes without any chaining operator at all.',
  explanation:
    "Blocking separators missed <code>$()</code>, which runs <code>id</code> and splices its output into the string — no <code>;</code> or <code>&amp;</code> required. The shell has too many execution features to blacklist; don't invoke a shell on user input.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.toolForm(ctx) })));
    r.post('/lookup', (req, res) => {
      const host = req.body.host || '';
      if (/[;|&\n]/.test(host))   //! blocks the chaining operators but not $()/backtick command substitution
        return res.send(shared.stagePage(ctx, { content: shared.toolForm(ctx, host), result: shared.deniedBanner('⛔ Chaining operators are not allowed.') }));
      exec(`echo Looking up ${host}`, { timeout: 3000 }, (e, stdout, stderr) => {
        const out = `${stdout || ''}${stderr || ''}`;
        res.send(shared.stagePage(ctx, { content: shared.toolForm(ctx, host) + shared.outputPanel(out), success: shared.looksInjected(out) }));
      });
    });
    return r;
  },
};
