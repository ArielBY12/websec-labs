'use strict';

// Stage 5 — function eval is off, but a "type" allowlist includes a gadget class.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 5,
  slug: 'type-gadget',
  title: 'Type allowlist with a gadget',
  defense: 'No function eval; revives only allowlisted __type classes.',
  hint: "Functions are gone, but the deserializer revives objects tagged <code>__type</code> from an allowlist — and one allowed type, <code>Template</code>, evaluates its <code>src</code>. Send <code>{\"p\":{\"__type\":\"Template\",\"src\":\"global.__DESER_FLAG__\"}}</code>.",
  lesson: 'A class allowlist is only safe if none of the allowed classes is a gadget — one that runs code on revival defeats it.',
  explanation:
    "The <code>Template</code> reviver called <code>eval</code> on attacker-controlled <code>src</code>, so restricting to “known types” still gave RCE. Deserialization gadgets are exactly such trusted-looking classes; audit every revivable type, or avoid custom revival.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const reviveTypes = {
      Duration: (v) => ({ ms: Number(v.ms) || 0 }),
      Template: (v) => eval(String(v.src)),   //! the type allowlist includes a gadget — "Template" evaluates attacker-controlled src
    };
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.tokenForm(ctx, '{"d":{"__type":"Duration","ms":500}}') })));
    r.post('/restore', (req, res) => {
      const token = req.body.token || '{}';
      let obj;
      try { obj = shared.unserialize(token, { functions: false, reviveTypes }); }
      catch (e) { return res.send(shared.stagePage(ctx, { content: shared.tokenForm(ctx, token), result: shared.deniedBanner('⛔ ' + e.message) })); }
      res.send(shared.stagePage(ctx, { content: shared.tokenForm(ctx, token) + shared.resultPanel(obj), success: shared.deserLeaked(JSON.stringify(obj)) }));
    });
    return r;
  },
};
