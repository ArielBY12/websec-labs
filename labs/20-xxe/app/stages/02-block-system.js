'use strict';

// Stage 2 — the "SYSTEM" keyword is blacklisted, but PUBLIC external ids also load
// a resource.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 2,
  slug: 'block-system',
  title: 'Blacklists SYSTEM',
  defense: 'Rejects XML containing the "SYSTEM" keyword.',
  hint: `SYSTEM is blocked — but an external entity can also be declared with a PUBLIC identifier, which still has a URL:<br><code>&lt;!ENTITY xxe PUBLIC "-//x//EN" "file://${shared.SECRET_PATH}"&gt;</code>`,
  lesson: 'External entities have two forms (SYSTEM and PUBLIC) — blacklisting one keyword misses the other.',
  explanation:
    "A <code>PUBLIC</code> external identifier carries a system URL too, so it read the file without the word <code>SYSTEM</code>. Don't blacklist keywords; disable external entity resolution entirely.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.xmlForm(ctx) })));
    r.post('/import', (req, res) => {
      const xml = req.body.xml || '';
      if (/SYSTEM/.test(xml))   //! blacklists the "SYSTEM" keyword — an external PUBLIC identifier still loads the file
        return res.send(shared.stagePage(ctx, { content: shared.xmlForm(ctx, xml), result: shared.deniedBanner('⛔ SYSTEM entities are not allowed.') }));
      const result = shared.resolveXml(xml, { generalExternal: true });
      res.send(shared.stagePage(ctx, { content: shared.xmlForm(ctx, xml) + shared.resultPanel(result), success: /XXE\{/.test(result) }));
    });
    return r;
  },
};
