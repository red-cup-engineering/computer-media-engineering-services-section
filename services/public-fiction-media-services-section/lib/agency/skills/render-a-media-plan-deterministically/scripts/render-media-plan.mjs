#!/usr/bin/env node
/**
 * Skill script: render-a-media-plan-deterministically.
 *   input    media-plan.admitted.json (protocol file from compile-a-media-plan)  OUT-DIR
 *   outputs  OUT-DIR/preview.mp4, captions.srt, scene PNG/SVG masters, score.wav/.mid,
 *            preview-manifest.json, render-receipt.json (the protocol file the reviewer reads)
 *   exit     0 rendered and every postcondition held; 2 refused or a postcondition failed
 *            (refusals on stdout, render-receipt.json says which check); 1 usage
 *   effects  writes only inside OUT-DIR; no network, no provider, no publication
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderMediaPlan } from '../../../../../apps/render-media-plan.mjs';

try {
  const [planFile, outDir, ...rest] = process.argv.slice(2);
  if (!planFile || !outDir || rest.length) throw new TypeError('usage: render-media-plan.mjs media-plan.admitted.json OUT-DIR');
  const out = renderMediaPlan(JSON.parse(readFileSync(resolve(planFile), 'utf8')), { outDir });
  process.stdout.write(`${JSON.stringify(out.ok ? out.receipt : { ok: false, refusals: out.refusals }, null, 2)}\n`);
  process.exitCode = out.ok ? 0 : 2;
} catch (error) {
  process.stderr.write(`${error?.message ?? error}\n`);
  process.exitCode = 1;
}
