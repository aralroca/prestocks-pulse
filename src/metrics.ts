import type { Flow, History, IndexLevel, PreStock, Premium, Snapshot } from "./types.ts";

export const INDEX_BASE_LEVEL = 1000;
const FAIR_BAND_PCT = 1;

export function premiumPct(tokenPrice: number, markPrice: number): number {
  return (tokenPrice / markPrice - 1) * 100;
}

export const DIVERGENCE_ALERT_PCT = 10;

/** How far the on-chain executable price sits from the issuer API price. Large values flag stale data or corporate actions (e.g. an IPO conversion window). */
export function divergencePct(apiPrice: number, executablePrice: number): number {
  return (executablePrice / apiPrice - 1) * 100;
}

export function isDiverged(apiPrice: number, executablePrice: number): boolean {
  return Math.abs(divergencePct(apiPrice, executablePrice)) > DIVERGENCE_ALERT_PCT;
}

function signalFor(pct: number): Premium["signal"] {
  if (pct > FAIR_BAND_PCT) return "rich";
  if (pct < -FAIR_BAND_PCT) return "cheap";

  return "fair";
}

export function premiumRadar(stocks: PreStock[]): Premium[] {
  return stocks
    .map((s) => ({
      symbol: s.symbol,
      tokenPrice: s.tokenPrice,
      markPrice: s.markPrice,
      premiumPct: premiumPct(s.tokenPrice, s.markPrice),
      signal: signalFor(premiumPct(s.tokenPrice, s.markPrice)),
    }))
    .sort((a, b) => b.premiumPct - a.premiumPct);
}

export function aumUsd(stocks: PreStock[]): number {
  return stocks.reduce((sum, s) => sum + s.tokenPrice * s.supply, 0);
}

export function valuationWeights(snapshot: Snapshot): Record<string, number> {
  const total = Object.values(snapshot.tokens).reduce((sum, t) => sum + t.mv, 0);
  const entries = Object.entries(snapshot.tokens).map(([sym, t]) => [sym, t.mv / total]);

  return Object.fromEntries(entries);
}

export function indexLevel(base: Snapshot, latest: Snapshot): IndexLevel {
  const weights = valuationWeights(base);
  const level = Object.entries(weights).reduce((sum, [sym, w]) => {
    const now = latest.tokens[sym]?.p ?? base.tokens[sym].p;

    return sum + w * (now / base.tokens[sym].p);
  }, 0);

  return { level: level * INDEX_BASE_LEVEL, base: base.t, latest: latest.t, weights };
}

export function indexSeries(history: History): { t: string; level: number }[] {
  const [base] = history.snapshots;

  if (!base) return [];

  return history.snapshots.map((s) => ({ t: s.t, level: indexLevel(base, s).level }));
}

export function flows(start: Snapshot, end: Snapshot): Flow[] {
  return Object.entries(end.tokens)
    .map(([symbol, now]) => {
      const before = start.tokens[symbol] ?? now;
      const deltaSupply = now.s - before.s;

      return { symbol, supplyStart: before.s, supplyEnd: now.s, deltaSupply, netFlowUsd: deltaSupply * now.m };
    })
    .sort((a, b) => Math.abs(b.netFlowUsd) - Math.abs(a.netFlowUsd));
}

export function basket(stocks: PreStock[], usd: number): { symbol: string; usd: number; units: number }[] {
  const total = stocks.reduce((sum, s) => sum + s.markValuation, 0);

  return stocks.map((s) => {
    const share = s.markValuation / total;

    return { symbol: s.symbol, usd: usd * share, units: (usd * share) / s.tokenPrice };
  });
}
