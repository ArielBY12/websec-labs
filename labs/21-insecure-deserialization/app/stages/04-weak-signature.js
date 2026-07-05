'use strict';

// Stage 4 — the token must be signed, but with a known/weak key.

const express = require('express');
const crypto = require('crypto');
const shared = require('../shared');

const KEY = 's3cret';   // weak, and leaked in the client bundle

module.exports = {
  stage: 4,
  slug: 'weak-signature',
  title: 'Signed with a weak/known key',
  defense: 'Only deserializes tokens with a valid HMAC signature.',
  hint: `The token is <code>base64(json).hmacSHA256(base64, key)</code> and only verified tokens are deserialized — but the key is weak and known (<code>${KEY}</code>). Sign your own malicious payload and it'll be accepted, then eval'd.`,
  lesson: 'A signature only helps if the key is secret and strong — a known/weak key lets the attacker sign malicious payloads.',
  explanation:
    "Integrity checks assume the attacker can't produce a valid signature. With a known key they can, so the RCE payload was accepted and eval'd. Keep signing keys secret and strong — and still don't deserialize code.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const sign = (b) => crypto.createHmac('sha256', KEY).update(b).digest('hex');
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.tokenForm(ctx, `${Buffer.from('{"theme":"dark"}').toString('base64')}.${sign(Buffer.from('{"theme":"dark"}').toString('base64'))}`) })));
    r.post('/restore', (req, res) => {
      const token = req.body.token || '';
      const [b, sig] = String(token).split('.');
      if (!b || !sig || sign(b) !== sig)   //! integrity via a known/weak signing key — forge the signature and the eval still runs
        return res.send(shared.stagePage(ctx, { content: shared.tokenForm(ctx, token), result: shared.deniedBanner('⛔ Invalid signature.') }));
      let obj;
      try { obj = shared.unserialize(Buffer.from(b, 'base64').toString('utf8'), { functions: true }); }
      catch (e) { return res.send(shared.stagePage(ctx, { content: shared.tokenForm(ctx, token), result: shared.deniedBanner('⛔ ' + e.message) })); }
      res.send(shared.stagePage(ctx, { content: shared.tokenForm(ctx, token) + shared.resultPanel(obj), success: shared.deserLeaked(JSON.stringify(obj)) }));
    });
    return r;
  },
};
