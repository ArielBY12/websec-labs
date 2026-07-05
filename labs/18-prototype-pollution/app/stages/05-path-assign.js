'use strict';

// Stage 5 — a different sink: a dotted-path setter (like lodash.set) with no guard.

const express = require('express');
const shared = require('../shared');

const GADGET = 'pp5';

module.exports = {
  stage: 5,
  slug: 'path-assign',
  title: 'Dotted-path assignment sink',
  defense: 'A path setter for nested preferences (no merge involved).',
  hint: "This endpoint sets a value at a dotted path, e.g. <code>ui.theme</code>. Put <code>__proto__</code> in the path: <code>POST /set</code> with <code>path=__proto__.pp5</code>, <code>value=true</code>.",
  lesson: 'Prototype pollution has many sinks — dotted-path setters (lodash.set-style) are as dangerous as recursive merges.',
  explanation:
    "Walking a dotted path and creating missing objects follows <code>__proto__</code> straight to <code>Object.prototype</code>. Every property-writing helper that accepts attacker-controlled key paths needs the same __proto__/constructor/prototype guard.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const setPath = (obj, keys, val) => {
      let o = obj;
      for (let i = 0; i < keys.length - 1; i++) { const k = keys[i]; if (o[k] == null) o[k] = {}; o = o[k]; }   //! walks a dotted path with no key guard — "__proto__" in the path pollutes
      o[keys[keys.length - 1]] = val;
    };
    const run = (path, value) => { setPath({}, String(path).split('.'), value); return ({})[GADGET] !== undefined; };

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, {
      content: `<div class="card"><h2>⚙️ Set a preference</h2>
        <form method="POST" action="${ctx.mount}/set">
          <label>Path</label><input name="path" value="__proto__.pp5">
          <label>Value</label><input name="value" value="true">
          <button>Set</button></form>
        <p class="hint">Pollute <code>Object.prototype</code> through the path.</p></div>`,
    })));
    r.post('/set', (req, res) => {
      const isP = run(req.body.path || '', req.body.value || '');
      res.send(shared.stagePage(ctx, { content: shared.probePanel(GADGET, isP), success: isP }));
    });
    return r;
  },
};
