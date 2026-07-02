'use strict';

// Stage 2 — the token is now verified with HS256 before its role is trusted.

const express = require('express');
const shared = require('../shared');

const SECRET = 'lab6-stage2-secret';

module.exports = {
  stage: 2,
  slug: 'alg-none',
  title: 'Accepts alg=none',
  defense: 'Verifies HS256 — but also accepts alg:none.',
  hint: "Tampering and re-encoding fails now — there's a real HS256 check. But the token's own <code>header.alg</code> decides how it's verified. What if you set <code>alg</code> to <code>\"none\"</code> and send no signature at all? Craft <code>base64url({\"alg\":\"none\"}).base64url({\"role\":\"admin\"}).</code> (note the trailing dot, empty signature).",
  lesson: "Let the token choose its own algorithm and an attacker chooses 'none' — pin the algorithm server-side.",
  explanation:
    "The verifier honored the token's <code>alg</code> header. By declaring <code>alg:none</code> and sending an empty signature, the attacker told the server \"this token needs no signature\" — and the server agreed, trusting the forged <code>admin</code> claim.",
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
      let role = null;
      if (header?.alg === 'none') role = payload?.role;                       //! treats alg:"none" as a valid, signature-free token
      else if (shared.verifyHS256(token, SECRET)) role = payload?.role;
      if (role !== 'admin') return res.send(shared.stagePage(ctx, { result: shared.deniedBanner() }));
      res.send(shared.stagePage(ctx, { result: shared.adminView(), success: true }));
    });

    return r;
  },
};
