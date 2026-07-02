'use strict';

// Stage 4 — HS256 is verified with a strong key, and the key is selected by the
// token's `kid` (key id) header, loaded from the server's keys directory.

const express = require('express');
const fs = require('fs');
const path = require('path');
const shared = require('../shared');

const KEYS_DIR = path.join(__dirname, '..', 'keys');

module.exports = {
  stage: 4,
  slug: 'kid-path',
  title: 'kid header chooses the key file',
  defense: 'Loads the HMAC key named by the token\'s kid header.',
  hint: "Brute force is hopeless now — the key is strong. But look at the token header: <code>kid</code> tells the server <em>which key file</em> to load, and you control the header. What if <code>kid</code> points at a file whose contents you already know — like an empty one? Try <code>kid</code> = <code>../../../../../../dev/null</code> and sign with an empty key.",
  lesson: "Never resolve the verification key from an attacker-controlled header — kid path traversal points the server at a key you control (e.g. the empty /dev/null).",
  explanation:
    "The server read the HMAC key from the file named in <code>kid</code> — and <code>kid</code> is attacker-controlled. Pointing it at <code>/dev/null</code> (via path traversal) made the key an empty string, so a token signed with an empty key verified. " +
    "Key selection must never trust token headers: pin the key server-side, or map <code>kid</code> through a strict allowlist.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();

    r.get('/', (req, res) => {
      let token = shared.tokenFrom(req);
      if (!token) {
        const key = fs.readFileSync(path.join(KEYS_DIR, 'main.key'));
        token = shared.signHS256({ user: 'alice', role: 'user' }, key, { alg: 'HS256', typ: 'JWT', kid: 'main.key' });
        res.cookie('lab6_token', token);
      }
      const payload = shared.parseJwt(token).payload || {};
      res.send(shared.stagePage(ctx, { content: shared.dashboard(payload) + shared.tokenBox(token) }));
    });

    r.get('/admin', (req, res) => {
      const token = shared.tokenFrom(req);
      const { header, payload } = shared.parseJwt(token);
      let role = null;
      try {
        const key = fs.readFileSync(path.join(KEYS_DIR, header?.kid || ''));   //! the HMAC key is loaded from the file named in the token's kid header — kid is attacker-controlled
        if (shared.verifyHS256(token, key)) role = payload?.role;
      } catch { /* unreadable key → unverified */ }
      if (role !== 'admin') return res.send(shared.stagePage(ctx, { result: shared.deniedBanner() }));
      res.send(shared.stagePage(ctx, { result: shared.adminView(), success: true }));
    });

    return r;
  },
};
