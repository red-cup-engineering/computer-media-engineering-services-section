---
name: run-the-media-plan-cycle
description: "Runbook for the end-to-end cycle that takes one media plan to Google Flow orders and to a deterministic render, with the checks between steps, the stop points that need a person, and how to roll back."
type: skill
skill-closure-kind: process
requires-capabilities:
  - office
  - agency-record
---

# Run the media plan cycle (runbook)

> Form gap: there is no runbook form yet (a norm-triggered sequence that composes skills). This
> instance is written as a `process` skill, the closest existing shape. See the system-debt record
> `no-runbook-form-for-norm-triggered-skill-sequences`.

**Office:** media plan steward (this section). **Duty:** compile media plans for every renderer.
**Trigger (norm):** whenever a source document (a script, a lesson report, a research paper such as a
Climate Place-By-Place paper) is to become a video, or an existing plan changes. A plan's content
address (`planId`) is the unit of work: the same `planId` is never compiled, ordered or rendered twice
to the same effect.

## Skills composed, in order

| # | Step | Skill / script | Kind | Reads | Writes (protocol file) |
|---|---|---|---|---|---|
| 1 | Author the plan from the source | *(authoring: LLM judgment, no script)* | judgment | source document | `PLAN.json` |
| 2 | Admit and compile | [compile-a-media-plan](../compile-a-media-plan/SKILL.md) `compile-media-plan.mjs` | deterministic | `PLAN.json`, optional Flow journal | `media-plan.admitted.json`, `media-plan.compile-receipt.json` or `media-plan.refusals.json` |
| 3 | Audit the receipt | `verify-compile-receipt.mjs` | deterministic | the two files above | one JSON line, exit code |
| 4a | Prepare Flow orders | `prepare-flow-orders-from-a-media-plan` (google-flow section) | deterministic | `media-plan.admitted.json`, observed model catalog | `flow-orders.prepared.json` |
| 4b | Render deterministically | `render-a-media-plan-deterministically` (media-engineering section) | deterministic | `media-plan.admitted.json` | `preview.mp4`, `captions.srt`, `render-receipt.json` |
| 5 | Queue the Flow orders | `flow-media-plan --queue` | **effect: writes orders/pending** | `flow-orders.prepared.json` | queued JSONL (still unspent) |
| 6 | Review the render and any Flow clips | independent reviewer | judgment (person) | outputs | review record |
| 7 | Publish | *(out of scope: youtube / google-drive sections)* | person-authorized | description, captions, end card from the receipt | publication receipt |

Steps 4a and 4b are independent and may run in parallel; both consume the same `media-plan.admitted.json`.
Step 5 is a separate, explicit act: preparing orders spends nothing, queueing writes a file, and only
`flow-generate --queue` (its allowance, pacing and circuit breaker) can spend credits.

## Checks between steps

- After 2: `warnings` read; no `GENERATIVE_TEXT_REQUEST` left unaddressed for a text-bearing graphic.
- After 3: exit 0. Never hand a receipt that fails audit to a renderer or a queue.
- After 4a: `status` is `PREPARED_NOT_QUEUED_NOT_SUBMITTED`; `estimate.units` is within the ceiling the person set. `HELD_CREDIT_CEILING` is a stop, not a trim.
- After 4b: every check in `render-receipt.json` is `ok`.
- Before 5: the person has said to queue. A runbook never queues on its own.

## Rollback

- Steps 1-4 write only into the working directory: delete it.
- Step 5: remove the queued file from `orders/pending` before the next `flow-generate --queue` run
  claims it (it names the plan: `...-plan-<plan-slug>.jsonl`). After a claim, the orders are Flow's,
  and the allowance ledger records any spend; do not edit the journal.
- A plan fix is a new plan (new `planId`); generations already journaled for unchanged prompts are
  reused automatically through `--completions`.

## Stop points that need a person

Plan authorship sign-off for rights and source claims; the credit ceiling; queueing; review of any
generated or rendered media; publication to any channel.
