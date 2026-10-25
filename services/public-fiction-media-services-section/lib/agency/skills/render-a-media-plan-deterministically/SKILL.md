---
name: render-a-media-plan-deterministically
description: "Render one admitted media plan locally with the procedural microdrama renderer (SVG scene art or the plan's SVG frames and overlays, kinetic score, burned-in captions, end card with the paper link) and check the video against the compile receipt."
type: skill
skill-closure-kind: operation
requires-capabilities:
  - office
  - agency-record
---

# Render a media plan deterministically

**Owner:** Public Fiction production (this section). **Step 4b of**
[run-the-media-plan-cycle](https://github.com/red-cup-engineering/computer-media-engineering-services-section/blob/main/lib/agency/skills/run-the-media-plan-cycle/SKILL.md).
**Done when:** `render-receipt.json` has every check `ok`.

## Hoare contract (`render-media-plan/1`)

| | |
|---|---|
| **Input** | `media-plan.admitted.json`, an empty `OUT-DIR` |
| **Precondition** | the plan compiles for target `deterministic` (coded refusals otherwise, nothing written); `ffmpeg` and `ffprobe` on PATH; `audio.music.profile` is not `none`; `espeak` present when `voice` is `rehearsal`; `OUT-DIR` holds no `preview.mp4` |
| **Script** | [`scripts/render-media-plan.mjs`](scripts/render-media-plan.mjs) over [`apps/render-media-plan.mjs`](../../../../apps/render-media-plan.mjs) and [`apps/previsualize-microdrama.mjs`](../../../../apps/previsualize-microdrama.mjs) |
| **Output protocol file** | `render-receipt.json` (`MediaPlanRenderReceipt`) beside the media |
| **Postcondition** | measured frame count, geometry and duration equal the compiled job's; an audio track exists; every compiled caption cue is in `captions.srt`; the preview's SHA-256 equals the manifest's; the receipt names the plan and the compile receipt's output address |
| **Refusals** | the compile contract's codes, plus `RENDERER_UNSUPPORTED`, `OUTDIR_REQUIRED`, `POSTCONDITION_FAILED` |

## Steps

1. `node scripts/render-media-plan.mjs media-plan.admitted.json OUT-DIR`
2. Read `render-receipt.json`; all checks `ok`. A failed check keeps the files for diagnosis and exits 2.
3. Hand `OUT-DIR` to an independent reviewer. The output is a development-only previs: the
   renderer stamps it `UNAPPROVED / PREVIS`, and this skill approves nothing and publishes nothing.

## Judgment

None in the script. Whether the render is acceptable is a reviewer's judgment.
