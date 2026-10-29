import { openDailyStoreAuto } from "@red-cup-engineering/footing/store-factory";
import { openFileLedgerBoonStore } from "./store.mts";
import type { LedgerEntry, BoonRecord } from "./store.mts";

export interface StoreFactoryEnv {
  [name: string]: string | undefined;
}

export interface Store {
  root: string;
  appendRun(rec: any): Promise<void>;
  readRunsForDate(date: string): Promise<any[]>;
  readRunById(date: string, runId: string): Promise<any | null>;
  appendScore(rec: any): Promise<void>;
  readScoresForDate(date: string): Promise<any[]>;
  listRunDates(): Promise<string[]>;
  listScoreDates(): Promise<string[]>;
  hasScoredLock(date: string, actor: string): Promise<boolean>;
  writeScoredLock(date: string, actor: string, runId: string): Promise<void>;
  appendLedger(entry: LedgerEntry): Promise<void>;
  hasLedgerRef(ref: string): Promise<boolean>;
  appendBoon(entry: BoonRecord): Promise<void>;
  readBoonsForWeek(appliesWeekStart: string): Promise<BoonRecord[]>;
  hasBoonsForWeek(appliesWeekStart: string): Promise<boolean>;
}

// asAsyncLedgerBoon — the same sync-to-async adapter shape footing's own asAsyncDailyStore uses,
// applied to the file-backed ledger/boon half so every Store method is uniformly Promise-returning
// regardless of backend (a caller should never need to know which half of a composed Store came
// from which package).
function asAsyncLedgerBoon(store: ReturnType<typeof openFileLedgerBoonStore>) {
  return {
    appendLedger: (entry: LedgerEntry) => Promise.resolve().then(() => store.appendLedger(entry)),
    hasLedgerRef: (ref: string) => Promise.resolve().then(() => store.hasLedgerRef(ref)),
    appendBoon: (entry: BoonRecord) => Promise.resolve().then(() => store.appendBoon(entry)),
    readBoonsForWeek: (w: string) => Promise.resolve().then(() => store.readBoonsForWeek(w)),
    hasBoonsForWeek: (w: string) => Promise.resolve().then(() => store.hasBoonsForWeek(w)),
  };
}

export function openStoreAuto(root: string): Store {
  return { ...openDailyStoreAuto(root), ...asAsyncLedgerBoon(openFileLedgerBoonStore(root)) } as Store;
}
