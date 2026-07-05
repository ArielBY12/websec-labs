'use strict';

// Stage 3 — a homemade cipher: repeating-key XOR, then base64.

const express = require('express');
const shared = require('../shared');

const KEY = Buffer.from('cryptkey');   // 8-byte repeating key

module.exports = {
  stage: 3,
  slug: 'xor',
  title: 'Repeating-key XOR',
  defense: 'XORs the token with a fixed key, then base64.',
  hint: "Now it's XORed with a secret key. But you know your own token's plaintext (<code>alice|user</code>) and its ciphertext — XOR them to recover the key stream, then encrypt <code>admin|admin</code> yourself.",
  lesson: 'A repeating-key XOR (or any homemade cipher) falls to a known-plaintext attack.',
  explanation:
    "With a known plaintext/ciphertext pair, <code>key = plaintext XOR ciphertext</code> recovers the key stream, which then encrypts any message. Don't invent ciphers; use vetted authenticated encryption (AES-GCM).",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const xor = (buf) => Buffer.from(buf.map((b, i) => b ^ KEY[i % KEY.length]));
    const issue = (u, role) => xor(Buffer.from(`${u}|${role}`)).toString('base64');
    const verify = (t) => {   //! repeating-key XOR is broken by known-plaintext: your token + the known "alice|user" reveals the key
      try { const [user, role] = xor(Buffer.from(String(t), 'base64')).toString('utf8').split('|'); return user && role ? { user, role } : null; }
      catch { return null; }
    };

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.tokenCard(ctx, issue('alice', 'user')) })));
    r.get('/verify', (req, res) => res.send(shared.verifyPage(ctx, verify(req.query.token || ''), issue('alice', 'user'))));
    return r;
  },
};
