import type { History, PreStock, Snapshot } from "./types.ts";
import { PRESTOCKS_API } from "./prestocks.ts";

export const HISTORY_PATH = "docs/data/history.json";
export const CATALOGUE_PATH = "docs/data/prestocks.json";
const MAX_SNAPSHOTS = 24 * 90; // 90 days at hourly cadence

export function emptyHistory(): History {
  return { version: 1, source: PRESTOCKS_API, snapshots: [] };
}

export function appendSnapshot(history: History, snapshot: Snapshot): History {
  const snapshots = [...history.snapshots, snapshot].slice(-MAX_SNAPSHOTS);

  return { ...history, snapshots };
}

export function latest(history: History): Snapshot | undefined {
  return history.snapshots.at(-1);
}

export function snapshotBefore(history: History, hours: number): Snapshot | undefined {
  const end = latest(history);

  if (!end) return undefined;

  const cutoff = new Date(end.t).getTime() - hours * 3_600_000;
  const older = history.snapshots.filter((s) => new Date(s.t).getTime() <= cutoff);

  return older.at(-1) ?? history.snapshots[0];
}

export function seriesFor(history: History, symbol: string): { t: string; p: number; m: number; s: number }[] {
  return history.snapshots
    .filter((snap) => snap.tokens[symbol])
    .map((snap) => ({ t: snap.t, ...snap.tokens[symbol] }))
    .map(({ t, p, m, s }) => ({ t, p, m, s }));
}

export const DATASET_URL = "https://aralroca.github.io/prestocks-pulse/data/history.json";

async function readLocal(path: string): Promise<History | undefined> {
  const { readFile } = await import("node:fs/promises");

  return readFile(path, "utf8").then((text) => JSON.parse(text) as History, () => undefined);
}

async function readRemote(url: string, fetchFn: typeof fetch): Promise<History> {
  const res = await fetchFn(url);

  if (!res.ok) throw new Error(`Dataset ${res.status}`);

  return (await res.json()) as History;
}

/** Local dataset when running inside the repo, otherwise the published open dataset. */
export async function loadHistory(path = HISTORY_PATH, url = DATASET_URL, fetchFn = fetch): Promise<History> {
  const local = await readLocal(path);

  return local ?? readRemote(url, fetchFn).catch(() => emptyHistory());
}

async function write(path: string, content: string): Promise<void> {
  const { mkdir, writeFile } = await import("node:fs/promises");

  await mkdir(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  await writeFile(path, content);
}

export async function saveHistory(history: History, path = HISTORY_PATH): Promise<void> {
  await write(path, JSON.stringify(history));
}

export async function saveCatalogue(stocks: PreStock[], multipliers: Record<string, number>, path = CATALOGUE_PATH): Promise<void> {
  await write(path, JSON.stringify({ updatedAt: new Date().toISOString(), multipliers, prestocks: stocks }));
}
