import type { PreStock, Snapshot } from "./types.ts";

export const PRESTOCKS_API = "https://prestocks.com/api/prestocks";

export async function fetchPreStocks(fetchFn = fetch): Promise<PreStock[]> {
  const res = await fetchFn(PRESTOCKS_API, { headers: { accept: "application/json" } });

  if (!res.ok) throw new Error(`PreStocks API ${res.status}`);

  return (await res.json()) as PreStock[];
}

export function toSnapshot(stocks: PreStock[], at = new Date()): Snapshot {
  const entries = stocks.map((s) => [
    s.symbol,
    { p: s.tokenPrice, m: s.markPrice, s: s.supply, mv: s.markValuation },
  ]);

  return { t: at.toISOString(), tokens: Object.fromEntries(entries) };
}

export function findStock(stocks: PreStock[], symbol: string): PreStock {
  const wanted = symbol.trim().toUpperCase();
  const found = stocks.find((s) => s.symbol === wanted);

  if (!found) throw new Error(`Unknown PreStock "${symbol}". Known: ${stocks.map((s) => s.symbol).join(", ")}`);

  return found;
}
