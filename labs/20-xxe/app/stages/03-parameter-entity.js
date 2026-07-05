'use strict';

// Stage 3 — external GENERAL entities are disabled, but parameter entities are not.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 3,
  slug: 'parameter-entity',
  title: 'Parameter entities still external',
  defense: 'Disables external general entities (but not parameter entities).',
  hint: `A direct <code>&lt;!ENTITY xxe SYSTEM …&gt;</code> is ignored now. But parameter entities (<code>%</code>) still resolve externally — load the file into one, then embed it:<br><code>&lt;!ENTITY % p SYSTEM "file://${shared.SECRET_PATH}"&gt;&lt;!ENTITY xxe "%p;"&gt;</code>`,
  lesson: 'Disabling general external entities isn’t enough — parameter entities can load external resources too.',
  explanation:
    "The parameter entity <code>%p</code> read the file, and the general entity <code>xxe</code> embedded it, so the general-entity restriction was sidestepped. Disable ALL external entity resolution (general and parameter), and DTD loading.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.xmlForm(ctx) })));
    r.post('/import', (req, res) => {
      const xml = req.body.xml || '';
      const result = shared.resolveXml(xml, { generalExternal: false, parameterExternal: true });   //! disables external general entities but still resolves external parameter entities
      res.send(shared.stagePage(ctx, { content: shared.xmlForm(ctx, xml) + shared.resultPanel(result), success: /XXE\{/.test(result) }));
    });
    return r;
  },
};
