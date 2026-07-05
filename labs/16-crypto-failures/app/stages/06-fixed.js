'use strict';

// Stage 6 — the fix: HMAC-SHA256 with a strong random key, verified in constant time.

const express = require('express');
const crypto = require('crypto');
const shared = require('../shared');

const KEY = crypto.randomBytes(32);   // high-entropy, server-held
const mac = (s) => crypto.createHmac('sha256', KEY).update(s).digest('hex');

module.exports = {
  stage: 6,
  slug: 'fixed',
  title: 'HMAC with a strong random key',
  defense: 'HMAC-SHA256 with a 256-bit random key; constant-time compare.',
  hint: '',
  lesson: 'Protect token integrity with HMAC (or a signature) using a strong random key, compared in constant time; use AES-GCM when you also need confidentiality.',
  explanation:
    "The token is bound by an HMAC under a 256-bit random key the attacker never sees, checked in constant time — so plaintext edits, base64 tricks, XOR key recovery, keyless-hash recomputation, and PIN brute force all fail. Your genuine token still verifies as alice.",
  status: 'secure',

  createRouter(ctx) {
    const r = express.Router();
    const issue = (u, role) => { const p = `${u}|${role}`; return `${Buffer.from(p).toString('base64')}.${mac(p)}`; };
    const verify = (t) => {
      const [b, sig = ''] = String(t).split('.');
      if (!b) return null;
      const p = Buffer.from(b, 'base64').toString('utf8');
      const expected = mac(p);
      const a = Buffer.from(sig), e = Buffer.from(expected);
      if (a.length !== e.length || !crypto.timingSafeEqual(a, e)) return null;   //! verify an HMAC under a strong random key in constant time — no forged payload can produce a valid MAC
      const [user, role] = p.split('|'); return { user, role };
    };

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.tokenCard(ctx, issue('alice', 'user')) })));
    r.get('/verify', (req, res) => res.send(shared.verifyPage(ctx, verify(req.query.token || ''), issue('alice', 'user'))));
    return r;
  },
};
