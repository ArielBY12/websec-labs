'use strict';

// Stage 2 — the token is base64 "encrypted".

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 2,
  slug: 'base64',
  title: 'Base64 "encryption"',
  defense: 'Encodes the token with base64.',
  hint: "The token looks scrambled, but base64 is just encoding. Decode it, change the role to <code>admin</code>, and re-encode: base64 of <code>admin|admin</code>.",
  lesson: 'Encoding is not encryption — base64 is trivially reversible and provides no protection.',
  explanation:
    "Base64 is a reversible representation, not a cipher. Decoding revealed <code>alice|user</code>; re-encoding <code>admin|admin</code> forged an admin token. Use real cryptography (a MAC for integrity, AES-GCM for confidentiality).",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const issue = (u, role) => Buffer.from(`${u}|${role}`).toString('base64');
    const verify = (t) => {   //! base64 is encoding, not encryption — decode, edit the role, re-encode
      try { const [user, role] = Buffer.from(String(t), 'base64').toString('utf8').split('|'); return user && role ? { user, role } : null; }
      catch { return null; }
    };

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.tokenCard(ctx, issue('alice', 'user')) })));
    r.get('/verify', (req, res) => res.send(shared.verifyPage(ctx, verify(req.query.token || ''), issue('alice', 'user'))));
    return r;
  },
};
