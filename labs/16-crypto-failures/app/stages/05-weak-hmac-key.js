'use strict';

// Stage 5 — a real HMAC, but the key is a short numeric PIN.

const express = require('express');
const crypto = require('crypto');
const shared = require('../shared');

const KEY = '4217';   // 4-digit PIN — brute-forceable offline
const mac = (s) => crypto.createHmac('sha256', KEY).update(s).digest('hex');

module.exports = {
  stage: 5,
  slug: 'weak-hmac-key',
  title: 'Weak HMAC key',
  defense: 'HMAC-SHA256 with a short numeric key.',
  hint: "It's a proper HMAC now — but the key is a 4-digit PIN. Take your token (a known payload + its MAC) and brute-force all 10 000 PINs offline until the MAC matches; then sign <code>admin|admin</code>.",
  lesson: 'HMAC is only as strong as its key — a short/guessable key is recovered offline from one token.',
  explanation:
    "A tiny keyspace defeats the MAC: trying every 4-digit PIN against a known payload/MAC pair recovers the key, after which any payload can be signed. Use a long, high-entropy random key.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const issue = (u, role) => { const p = `${u}|${role}`; return `${Buffer.from(p).toString('base64')}.${mac(p)}`; };
    const verify = (t) => {
      const [b, sig] = String(t).split('.');
      if (!b || !sig) return null;
      const p = Buffer.from(b, 'base64').toString('utf8');
      if (mac(p) !== sig) return null;   //! HMAC with a short guessable key — brute-force the PIN offline, then sign any payload
      const [user, role] = p.split('|'); return { user, role };
    };

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.tokenCard(ctx, issue('alice', 'user')) })));
    r.get('/verify', (req, res) => res.send(shared.verifyPage(ctx, verify(req.query.token || ''), issue('alice', 'user'))));
    return r;
  },
};
