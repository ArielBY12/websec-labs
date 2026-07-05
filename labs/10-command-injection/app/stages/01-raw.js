'use strict';

// Stage 1 — the host is concatenated straight into a shell command.

const express = require('express');
const { exec } = require('child_process');
const shared = require('../shared');

module.exports = {
  stage: 1,
  slug: 'raw',
  title: 'Raw shell concatenation',
  defense: 'None — the host is dropped into a shell string.',
  hint: "The server runs your host inside a shell with no filtering. Shells treat <code>;</code> as a command separator, so append your own: <code>127.0.0.1; id</code>.",
  lesson: 'Building a shell command by string concatenation lets metacharacters run arbitrary commands.',
  explanation:
    "Your input was placed into a string handed to <code>/bin/sh</code>, so <code>;</code> ended the lookup and started <code>id</code>. Never build shell strings from user input — pass arguments to the program directly (no shell).",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.toolForm(ctx) })));
    r.post('/lookup', (req, res) => {
      const host = req.body.host || '';
      const cmd = `echo Looking up ${host}`;   //! host is concatenated into a shell command — metacharacters like ; run extra commands
      exec(cmd, { timeout: 3000 }, (e, stdout, stderr) => {
        const out = `${stdout || ''}${stderr || ''}`;
        res.send(shared.stagePage(ctx, { content: shared.toolForm(ctx, host) + shared.outputPanel(out), success: shared.looksInjected(out) }));
      });
    });
    return r;
  },
};
