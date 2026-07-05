'use strict';

// Stage 1 — the deserializer evaluates a function marker (node-serialize style).

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 1,
  slug: 'eval-marker',
  title: 'Function-marker eval',
  defense: 'None — the deserializer revives functions.',
  hint: "The token is deserialized with function support. A value beginning with the marker <code>_$$ND_FUNC$$_</code> is <code>eval</code>'d — make it an immediately-invoked function:<br><code>{\"x\":\"_$$ND_FUNC$$_function(){return global.__DESER_FLAG__}()\"}</code>",
  lesson: 'A deserializer that revives/evaluates functions gives remote code execution to anyone who controls the input.',
  explanation:
    "The marker made the parser <code>eval</code> your function, and the trailing <code>()</code> ran it immediately (RCE). Never deserialize untrusted data with a format that can carry code; use plain JSON with no reviver.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.tokenForm(ctx) })));
    r.post('/restore', (req, res) => {
      const token = req.body.token || '{}';
      let obj;
      try { obj = shared.unserialize(token, { functions: true }); }   //! deserializes with function-eval enabled — a function-marker payload runs code
      catch (e) { return res.send(shared.stagePage(ctx, { content: shared.tokenForm(ctx, token), result: shared.deniedBanner('⛔ ' + e.message) })); }
      res.send(shared.stagePage(ctx, { content: shared.tokenForm(ctx, token) + shared.resultPanel(obj), success: shared.deserLeaked(JSON.stringify(obj)) }));
    });
    return r;
  },
};
