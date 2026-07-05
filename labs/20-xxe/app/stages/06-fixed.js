'use strict';

// Stage 6 — the fix: reject DTDs entirely; no entity processing at all.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 6,
  slug: 'fixed',
  title: 'DTDs disabled',
  defense: 'Rejects any document containing a DOCTYPE / entity declaration.',
  hint: '',
  lesson: 'Disable DTD/DOCTYPE processing (and external entities) in the XML parser — the single setting that closes every XXE variant.',
  explanation:
    "With DOCTYPE/entity declarations rejected outright, there is nothing to resolve — external entities, PUBLIC ids, parameter entities, external DTDs, and billion-laughs all fail. Plain XML without a DTD still parses. In real parsers this is one flag (e.g. disallow-doctype-decl / noent off / no external DTD).",
  status: 'secure',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.xmlForm(ctx) })));
    r.post('/import', (req, res) => {
      const xml = req.body.xml || '';
      if (/<!DOCTYPE|<!ENTITY/i.test(xml))   //! reject any DTD/entity declaration outright — no entity processing means no XXE
        return res.send(shared.stagePage(ctx, { content: shared.xmlForm(ctx, xml), result: shared.deniedBanner('⛔ DTDs are not allowed.') }));
      const result = shared.resolveXml(xml, {});   // no DTD present → nothing to expand
      res.send(shared.stagePage(ctx, { content: shared.xmlForm(ctx, xml) + shared.resultPanel(result) }));
    });
    return r;
  },
};
