'use strict';

// Stage 3 — alg is pinned to HS256 and the signature is properly verified.

const express = require('express');
const shared = require('../shared');

const SECRET = 'secret';

module.exports = {
  stage: 3,
  slug: 'weak-secret',
  title: 'Weak signing secret',
  defense: 'Verifies HS256 with a guessable secret.',
  hint: "alg:none and naive tampering both fail now — the HS256 signature is checked for real. But HMAC is only as strong as its key. This one is a single common dictionary word. Crack it offline (e.g. <code>hashcat -m 16500</code> or <code>jwt_tool</code> with rockyou), then sign your own <code>{\"role\":\"admin\"}</code> token with it.",
  lesson: 'A weak HMAC secret can be brute-forced offline; then the attacker signs valid tokens at will.',
  explanation:
    "The signature check was correct, but the secret was a common word. An attacker recovers it offline from a single captured token, then mints a perfectly valid token with <code>role:admin</code> — it passes verification because it's genuinely signed with the right key.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();

    r.get('/', (req, res) => {
      const token = shared.ensureToken(req, res, SECRET);
      const payload = shared.parseJwt(token).payload || {};
      res.send(shared.stagePage(ctx, { content: shared.dashboard(payload) + shared.tokenBox(token) }));
    });

    r.get('/admin', (req, res) => {
      const token = shared.tokenFrom(req);
      const { header, payload } = shared.parseJwt(token);
      const ok = header?.alg === 'HS256' && shared.verifyHS256(token, SECRET);   //! the HMAC secret is a guessable dictionary word — brute-forceable offline
      if (!ok || payload?.role !== 'admin') return res.send(shared.stagePage(ctx, { result: shared.deniedBanner() }));
      res.send(shared.stagePage(ctx, { result: shared.adminView(), success: true }));
    });

    return r;
  },
};
