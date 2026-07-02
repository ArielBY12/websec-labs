'use strict';

// Stage 1 — the session is a JWT; /admin reads the role from it.

const express = require('express');
const shared = require('../shared');

const SECRET = 'lab6-stage1-secret';

module.exports = {
  stage: 1,
  slug: 'unverified',
  title: 'Signature never verified',
  defense: "Reads the token's claims without verifying the signature.",
  hint: "A JWT is <code>header.payload.signature</code>, and the payload is just base64url JSON — not encrypted. Decode the middle part, change <code>\"role\":\"user\"</code> to <code>\"admin\"</code>, re-encode it, and send the token back. Does the server even check the signature?",
  lesson: 'Decoding a JWT proves nothing — only verifying its signature does. Unverified claims are attacker-controlled.',
  explanation:
    "The server base64url-decoded the payload and trusted <code>role</code> without ever verifying the signature. " +
    "Editing the payload (and leaving any signature) was enough — the token's contents were never authenticated.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();

    r.get('/', (req, res) => {
      const token = shared.ensureToken(req, res, SECRET);
      const payload = shared.parseJwt(token).payload || {};
      res.send(shared.stagePage(ctx, { content: shared.dashboard(payload) + shared.tokenBox(token) }));
    });

    r.get('/admin', (req, res) => {
      const payload = shared.parseJwt(shared.tokenFrom(req)).payload;   //! trusts the decoded payload's role — the signature is never verified
      if (payload?.role !== 'admin') return res.send(shared.stagePage(ctx, { result: shared.deniedBanner() }));
      res.send(shared.stagePage(ctx, { result: shared.adminView(), success: true }));
    });

    return r;
  },
};
