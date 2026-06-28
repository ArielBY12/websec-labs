---
name: teach-lab
description: Run the interactive WebSec Labs teaching session for a challenge — walk the user stage by stage (explain the insecure pattern, let them attempt the bypass, reveal the root cause, then introduce the next stage's defense), ending at the fixed version with a writeup and exploit test. Use when the user wants to learn/work through a lab in this repo (e.g. "let's do lab 01", "teach me the SQLi lab", "next stage").
---

# teach-lab

Drive a hands-on, Socratic walkthrough of a challenge. The user learns by
attempting each bypass themselves — you guide, you don't just hand over answers.

## Before you start
1. Read `CLAUDE.md` (terminology, guardrails) and the target lab's `lab.json`,
   `README.md`, and `app/stages/`.
2. If the lab app isn't running, tell the user how to start it
   (`cd labs/<id>/app && npm install && npm start`, or `docker compose up`) and
   which port. Each stage page already shows its own source + runtime effect.

## The loop (per stage, from stage 1 upward)
1. **Show & explain.** Point to the current stage file and the marked
   (🔴/🟠/🟢) line. Explain the insecure pattern and the wrong assumption behind
   it — concisely. Reference `app/stages/NN-slug.js`.
2. **Challenge the user.** Ask them to bypass it at `/s/<n>`. Give the `hint` from
   the module, then progressively stronger hints — but let them get it. Don't
   paste the winning payload first.
3. **Confirm & dissect.** Once they succeed (or after a real attempt), explain the
   root cause and *why* the payload worked, using the "executed query"/effect.
4. **Level up.** Introduce the next stage: what naive defense the developer added,
   and why it looks plausible. Move to step 1 for that stage.
5. **Reach `/fixed`.** Explain why parameterization/encoding/authorization/etc.
   actually closes the hole where the earlier attempts only hid it. Contrast with
   the common wrong "fixes".

## Finish
- Update the lab `README.md` writeup if anything is missing or unclear.
- Ensure the `exploit/` test covers every stage (run `verify-lab`).
- If the lab is fully taught, set `lab.json` `status` to `done` and tick the box
  in the root `README.md` map. Offer to commit (only if the user asks).

## Guardrails
- Never modify a vulnerable stage to make it "safer" mid-lesson — defenses live in
  the *next* stage.
- Keep the verbose error / executed-query panels; they're teaching aids.
- Match the user's pace and level (intermediate by default): explain the *why*,
  not just the payload.
