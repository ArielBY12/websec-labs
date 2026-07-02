'use strict';

// Stage 4 — the fix: pin the algorithm to HS256 and verify the signature against a
// strong, high-entropy secret before trusting any claim.

const express = require('express');
const shared = require('../shared');

// A long, random secret (in real apps: from a secret manager / env, never in source).
const SECRET = 'Hh3kF8s-2cWq9pLrZ0xV6yNb4mTgUaJd_eRiOu1S5tA';

module.exports = {
  stage: 6,
  slug: 'fixed',
  title: 'Verified, pinned algorithm',
  defense: 'Verifies HS256 with a strong server-side secret; pins the alg, ignores kid.',
  hint: '',
  lesson: 'Verify against a strong server-held key with a pinned algorithm; never let the token choose the algorithm or the key.',
  explanation:
    "Verification pins <code>alg</code> to HS256 and checks the signature against one long, server-held secret — it never reads <code>kid</code> and never switches keys by algorithm. " +
    "Tampered claims, <code>alg:none</code>, a weak-secret signature, a <code>kid</code> pointing at <code>/dev/null</code>, and the RS256→HS256 public-key trick all fail, because none of them was signed with the real secret — while alice's genuine token still signs her in.",
  status: 'secure',

  createRouter(ctx) {
    const r = express.Router();

    r.get('/', (req, res) => {
      const token = shared.ensureToken(req, res, SECRET);
      const { header, payload } = shared.parseJwt(token);
      const valid = header?.alg === 'HS256' && shared.verifyHS256(token, SECRET);
      res.send(shared.stagePage(ctx, {
        content: shared.dashboard(valid ? payload : {}) + shared.tokenBox(token),
      }));
    });

    r.get('/admin', (req, res) => {
      const token = shared.tokenFrom(req);
      const { header, payload } = shared.parseJwt(token);
      const valid = header?.alg === 'HS256' && shared.verifyHS256(token, SECRET);   //! pin the algorithm AND verify the signature with a strong secret before trusting claims
      if (!valid) return res.send(shared.stagePage(ctx, { result: shared.deniedBanner('🔒 Invalid or missing token.') }));
      if (payload?.role !== 'admin') return res.send(shared.stagePage(ctx, { result: shared.deniedBanner() }));
      res.send(shared.stagePage(ctx, { result: shared.adminView() }));
    });

    return r;
  },
};
