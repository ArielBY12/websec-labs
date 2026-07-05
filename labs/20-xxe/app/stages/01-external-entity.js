'use strict';

// Stage 1 — external general entities are enabled, so SYSTEM reads local files.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 1,
  slug: 'external-entity',
  title: 'External entities enabled',
  defense: 'None — the parser resolves external entities.',
  hint: `Declare a SYSTEM entity pointing at the secret file and reference it:<br><code>&lt;!DOCTYPE r [&lt;!ENTITY xxe SYSTEM "file://${shared.SECRET_PATH}"&gt;]&gt;&lt;r&gt;&amp;xxe;&lt;/r&gt;</code>`,
  lesson: 'A parser that resolves external entities will read local files (and reach internal URLs) on request.',
  explanation:
    "The <code>SYSTEM</code> entity made the parser read the file off disk and inline its contents. Disable DOCTYPE/DTD processing and external entities in the XML parser.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.xmlForm(ctx) })));
    r.post('/import', (req, res) => {
      const xml = req.body.xml || '';
      const result = shared.resolveXml(xml, { generalExternal: true });   //! external general entities enabled — a SYSTEM entity reads local files
      res.send(shared.stagePage(ctx, { content: shared.xmlForm(ctx, xml) + shared.resultPanel(result), success: /XXE\{/.test(result) }));
    });
    return r;
  },
};
