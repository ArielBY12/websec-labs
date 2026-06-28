'use strict';

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 2,
  slug: 'fixed',
  title: 'The correct fix',
  defense: 'TODO — the real mitigation (parameterize / encode / authorize / validate).',
  hint: '',
  lesson: 'TODO: why this approach removes the bug class entirely.',
  explanation: 'TODO: why the earlier payloads all fail against this version.',
  status: 'secure',

  createRouter(SQL, ctx) {
    const r = express.Router();

    r.get('/', (req, res) =>
      res.send(shared.stagePage(ctx, { content: '<p>TODO: build the secure version here.</p>' }))
    );

    r.post('/action', (req, res) => {
      const { input = '' } = req.body;
      const safe = input;   //! SECURE: TODO — handle `input` safely so the earlier PoCs all fail
      const result = `<pre>${shared.escapeHtml(safe)}</pre>`;
      res.send(shared.stagePage(ctx, { content: '', result }));
    });

    return r;
  },
};
