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
| **Precondition** | the plan compiles for target `deterministic` (coded refusals otherwise, nothing written); `ffmpeg` and `ffprobe` on PATH; `audio.music.profile` is not `none`; `espeak` present when `voice` is `rehearsal`; pure renderer supplier preflight succeeds (score ≤300s/5,000 events, animated abyssal shot ≤120s, rehearsal dialogue limits); `OUT-DIR` holds no `preview.mp4` |
| **Script** | [`scripts/render-media-plan.mjs`](scripts/render-media-plan.mjs) over [`apps/render-media-plan.mjs`](../../../../apps/render-media-plan.mjs) and [`apps/previsualize-microdrama.mjs`](../../../../apps/previsualize-microdrama.mjs) |
| **Output protocol file** | `render-receipt.json` (`MediaPlanRenderReceipt`) beside the media |
| **Postcondition** | measured frame count, geometry and duration equal the compiled job's; an audio track exists; `captions.srt` exactly equals the compiled SRT (empty tracks are valid); the soundtrack profile equals the compiled music option independently of visual style; the preview's SHA-256 equals the manifest's; the receipt names the plan and the compile receipt's output address |
| **Refusals** | the compile contract's codes, plus `RENDERER_UNSUPPORTED`, `OUTDIR_REQUIRED`, `POSTCONDITION_FAILED` |

## Steps

1. `node scripts/render-media-plan.mjs media-plan.admitted.json OUT-DIR`
2. Read `render-receipt.json`; all checks `ok`. A failed check keeps the files for diagnosis and exits 2.
3. Frame assets replace procedural scene/actor layers; overlays are composited last, in source order, including moving scenes. Static and animated scene masters preserve the plan's assets. Scratch files, including rehearsal scratch, stay beneath `OUT-DIR` and are removed on settlement.
4. Hand `OUT-DIR` to an independent reviewer. The output is a development-only previs: the
   manifest records `DEVELOPMENT_ONLY_NOT_APPROVED`. Generated stage art carries `UNAPPROVED / PREVIS`, but plan-supplied frames or opaque overlays may replace or cover that on-frame label. This skill approves nothing and publishes nothing.

## Judgment

None in the script. Whether the render is acceptable is a reviewer's judgment.

## Qualification and source custody

Executable source is maintained by Red Cup Engineering in `media-engineering-services-section`; Causeway Public Fiction retains creative/source data and publication authority. See [renderer receiving contract](../../../../../../specifications/media-plan-renderer-receiving.md) for custody evidence, exact supplier closure, test enrollment and the distinction between source acceptance and live consumer receiving.

Run `npm run test:media-plan-render` from the engineering checkout with its admitted `computer-media` 0.2.0 supplier and native FFmpeg/librsvg/libass toolchain. Native tests fail rather than skip when required tools are unavailable. Music `none` remains a coded refusal; a passing fixture does not qualify voiced rehearsal without eSpeak or portable byte identity across toolchains.
