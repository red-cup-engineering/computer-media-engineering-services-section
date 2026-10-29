import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateManifest } from '@red-cup-engineering/cartridge/manifest';
import { hashState } from '@red-cup-engineering/cartridge/replay';
import { createEngine, crucibleCartridge, replay } from './cartridge.mts';
import { legalMoves } from './engine.mts';
import { manifest, verify } from './manifest.mts';

const SEED = 'crucible-cartridge-test';

function playableIntents() {
  const state = createEngine(SEED);
  const move = legalMoves(state.tangle)[0];
  assert.ok(move, 'a fresh certified tangle must offer a legal move');
  return [{ kind: 'move' as const, move }];
}

test('Crucible uses the common cartridge replay and canonical state hash', () => {
  const intents = playableIntents();
  const result = replay(SEED, intents);
  assert.equal(result.valid, true);
  assert.equal(result.stateHash, hashState(result.finalState));
  assert.equal(result.finalState.totalCost > 0, true);
  assert.deepEqual(crucibleCartridge.deserialize(crucibleCartridge.serialize(result.finalState)), result.finalState);
});

test('the manifest describes the executable cartridge and verifier', () => {
  assert.deepEqual(validateManifest(manifest), { valid: true, errors: [] });
  const intents = playableIntents();
  const direct = replay(SEED, intents);
  const verified = verify(SEED, undefined, intents.map((intent, seq) => ({ seq, intent })));
  assert.deepEqual(verified.finalState, direct.finalState);
  assert.equal(verified.stateHash, direct.stateHash);
});
