import type { History, PreStock, Snapshot } from "../src/types.ts";

export const stocks: PreStock[] = [
  stock("OPENAI", 100, 102, 1000, 500e9),
  stock("SPACEX", 50, 49, 2000, 400e9),
  stock("KALSHI", 10, 10, 500, 100e9),
];

export function stock(symbol: string, tokenPrice: number, markPrice: number, supply: number, markValuation: number): PreStock {
  return {
    name: `${symbol} PreStocks`,
    symbol,
    description: `${symbol} description`,
    image: `https://www.prestocks.com/logos/${symbol.toLowerCase()}.png`,
    external_url: `https://www.prestocks.com/${symbol.toLowerCase()}`,
    contract_address: `Mint${symbol}`,
    markPrice,
    markValuation,
    tokenPrice,
    impliedValuation: markValuation * (tokenPrice / markPrice),
    supply,
  };
}

export function snap(t: string, prices: Record<string, [number, number, number, number]>): Snapshot {
  const entries = Object.entries(prices).map(([sym, [p, m, s, mv]]) => [sym, { p, m, s, mv }]);

  return { t, tokens: Object.fromEntries(entries) };
}

export const history: History = {
  version: 1,
  source: "test",
  snapshots: [
    snap("2026-09-17T00:00:00.000Z", { OPENAI: [100, 102, 1000, 500e9], SPACEX: [50, 49, 2000, 400e9], KALSHI: [10, 10, 500, 100e9] }),
    snap("2026-09-17T12:00:00.000Z", { OPENAI: [105, 102, 1100, 500e9], SPACEX: [50, 49, 2000, 400e9], KALSHI: [9, 10, 400, 100e9] }),
    snap("2026-09-18T00:00:00.000Z", { OPENAI: [110, 102, 1200, 500e9], SPACEX: [45, 49, 1900, 400e9], KALSHI: [10, 10, 400, 100e9] }),
  ],
};
