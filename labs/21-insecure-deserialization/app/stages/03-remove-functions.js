'use strict';

// Stage 3 — after deserializing, function-typed values are stripped — but too late.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 3,
  slug: 'remove-functions',
  title: 'Strips functions after parsing',
  defense: 'Deletes function-typed properties after deserializing.',
  hint: "It removes function values after parsing — but the eval already happened <em>during</em> parsing. Make the payload an immediately-invoked function so it runs and returns <em>data</em> (the flag), which isn't a function and survives the cleanup.",
  lesson: 'Deserialization side effects happen during parsing — cleaning up the result afterward is too late.',
  explanation:
    "The reviver eval'd (and your IIFE ran) while <code>JSON.parse</code> was still executing; deleting function properties afterward removed nothing because the payload returned a string. The danger is the execution during parse, not the shape of the result.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.tokenForm(ctx) })));
    r.post('/restore', (req, res) => {
      const token = req.body.token || '{}';
      let obj;
      try { obj = shared.unserialize(token, { functions: true }); }
      catch (e) { return res.send(shared.stagePage(ctx, { content: shared.tokenForm(ctx, token), result: shared.deniedBanner('⛔ ' + e.message) })); }
      for (const k of Object.keys(obj)) if (typeof obj[k] === 'function') delete obj[k];   //! strips function-typed results AFTER parsing — but an IIFE already executed during parse and returned data
      res.send(shared.stagePage(ctx, { content: shared.tokenForm(ctx, token) + shared.resultPanel(obj), success: shared.deserLeaked(JSON.stringify(obj)) }));
    });
    return r;
  },
};
