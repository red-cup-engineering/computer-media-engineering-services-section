/**
 * The cartridge boundary for Crucible.  The chemistry remains in `engine.mts`;
 * this module only gives that one reducer the shared, replayable game contract.
 */
import type { ApplyResult, Cartridge, ReplayResult } from '@red-cup-engineering/cartridge/replay';
import { defaultReplay } from '@red-cup-engineering/cartridge/replay';
import type { Intent } from '@red-cup-engineering/cartridge/intent-log';
import { applyMove, isSettled } from './engine.mts';
import type { Move, Tangle } from './types.mts';
import { spawnCertifiedTangle } from './validate.mts';

export interface CrucibleState {
  readonly seed: string;
  readonly tangle: Tangle;
  readonly totalCost: number;
  readonly settled: boolean;
}

/** The generic log envelope makes a domain move a first-class cartridge intent. */
export interface CrucibleIntent extends Intent {
  readonly kind: 'move';
  readonly move: Move;
}

export function createEngine(seed: string, _configId?: string): CrucibleState {
  const tangle = spawnCertifiedTangle(seed);
  return { seed, tangle, totalCost: 0, settled: isSettled(tangle) };
}

export function applyIntent(state: CrucibleState, intent: CrucibleIntent): ApplyResult<CrucibleState> {
  if (intent.kind !== 'move') throw new TypeError(`unknown Crucible intent: ${intent.kind}`);
  const { tangle, moveCost } = applyMove(state.tangle, intent.move);
  return {
    state: {
      ...state,
      tangle,
      totalCost: state.totalCost + moveCost.cost,
      settled: isSettled(tangle),
    },
    events: [{ kind: 'move-applied', moveCost }],
  };
}

export function replay(
  seed: string,
  intents: readonly CrucibleIntent[],
  configId?: string,
): ReplayResult<CrucibleState> {
  return defaultReplay({ createEngine, applyIntent }, seed, intents, configId);
}

export function serialize(state: CrucibleState): unknown {
  return JSON.parse(JSON.stringify(state));
}

export function deserialize(data: unknown): CrucibleState {
  if (typeof data !== 'object' || data === null) throw new TypeError('deserialize: malformed CrucibleState');
  const state = data as Record<string, unknown>;
  if (
    typeof state.seed !== 'string' ||
    typeof state.totalCost !== 'number' ||
    typeof state.settled !== 'boolean' ||
    typeof state.tangle !== 'object' || state.tangle === null
  ) throw new TypeError('deserialize: malformed CrucibleState');
  return state as unknown as CrucibleState;
}

export const crucibleCartridge: Cartridge<CrucibleState, CrucibleIntent> = {
  createEngine,
  applyIntent,
  replay,
  serialize,
  deserialize,
};
