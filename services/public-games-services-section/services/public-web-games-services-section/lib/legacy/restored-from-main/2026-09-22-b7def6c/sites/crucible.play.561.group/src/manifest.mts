import type { CartridgeManifest } from '@red-cup-engineering/cartridge/manifest';
import { createVerifier } from '@red-cup-engineering/cartridge/replay';
import { applyIntent, createEngine } from './cartridge.mts';

export const verify = createVerifier({ createEngine, applyIntent });

export const manifest: CartridgeManifest = {
  id: 'crucible',
  displayName: 'Crucible',
  description: 'A daily-seeded settling puzzle where every move is a deterministic, replayable transformation of a reaction network and its measured obstruction cost.',
  subdomain: 'crucible',
  entryPoints: { browser: '/web/index.html' },
  seedPolicy: { kind: 'daily-utc' },
  intentLog: {
    schemaVersion: 'crucible-cartridge-v1',
    schemaRef: 'src/cartridge.mts#CrucibleIntent',
  },
  replayVerifier: 'src/manifest.mts#verify',
  keywords: ['obstruction-theory', 'daily-puzzle', 'cohomology', 'settling', 'waidan', 'puzzle'],
};
