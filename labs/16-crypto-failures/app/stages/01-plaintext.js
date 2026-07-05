'use strict';

// Stage 1 — the token is plaintext with no integrity protection at all.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 1,
  slug: 'plaintext',
  title: 'Plaintext token',
  defense: 'None — the token is user|role in the clear.',
  hint: "Your token is literally <code>alice|user</code>. Change it to <code>admin|admin</code> and present it.",
  lesson: 'A token with no integrity protection can be rewritten to anything.',
  explanation:
    "The token carried the role in plaintext with nothing binding it, so editing it to <code>admin|admin</code> was accepted. Tokens must be integrity-protected (a MAC) so tampering is detected.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const issue = (u, role) => `${u}|${role}`;
    const verify = (t) => { const [user, role] = String(t).split('|'); return user && role ? { user, role } : null; };   //! the token is plaintext with no integrity — anyone can write admin|admin

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.tokenCard(ctx, issue('alice', 'user')) })));
    r.get('/verify', (req, res) => res.send(shared.verifyPage(ctx, verify(req.query.token || ''), issue('alice', 'user'))));
    return r;
  },
};
