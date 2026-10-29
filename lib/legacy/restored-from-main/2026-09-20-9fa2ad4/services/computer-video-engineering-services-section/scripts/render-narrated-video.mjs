#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { renderNarratedVideo } from '../src/index.mjs';

function usage() {
  return 'usage: render-narrated-video.mjs --input INPUT.json --work-directory JOB_DIRECTORY';
}

function options(argumentsList) {
  const result = {};
  for (let index = 0; index < argumentsList.length; index += 2) {
    const name = argumentsList[index];
    const value = argumentsList[index + 1];
    if (!['--input', '--work-directory'].includes(name) || !value || result[name]) throw new TypeError(usage());
    result[name] = value;
  }
  if (!result['--input'] || !result['--work-directory']) throw new TypeError(usage());
  return result;
}

const MAX_CAPTURE_CHARACTERS = 4000;

function appendCapped(current, chunk) {
  const next = current + chunk;
  return next.length > MAX_CAPTURE_CHARACTERS ? next.slice(-MAX_CAPTURE_CHARACTERS) : next;
}

function execute({ program, args }) {
  return new Promise((resolve, reject) => {
    // stdout is captured (not inherited) because a segmented render's
    // ffprobe duration-probe step reads its result from result.stdout.
    // stderr is both captured (bounded, for the runCommand refusal datum)
    // and echoed to this process's own stderr so it stays visible live.
    const child = spawn(program, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout = appendCapped(stdout, chunk); });
    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
      stderr = appendCapped(stderr, chunk);
    });
    child.once('error', reject);
    child.once('close', (code) => resolve({ code, stdout, stderr }));
  });
}

try {
  const parsed = options(process.argv.slice(2));
  const input = JSON.parse(await readFile(parsed['--input'], 'utf8'));
  const result = await renderNarratedVideo({ input, workDirectory: parsed['--work-directory'], execute });
  process.stdout.write(`${JSON.stringify({ artifactPath: result.artifactPath, artifactDigest: result.artifactDigest, plan: result.plan, provenance: result.provenance })}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
