import type { History, PreStock } from "../types.ts";
import { livePrices, quoteBuy, type LivePrice, type Quote } from "../jupiter.ts";
import { BROWSER_RPC, fetchMultipliers } from "../solana.ts";

export type Catalogue = { updatedAt: string; multipliers: Record<string, number>; prestocks: PreStock[] };
export type Live = { prices: Record<string, LivePrice>; quotes: Record<string, Quote | undefined> };

const QUOTE_USD = 100;

export async function loadCatalogue(): Promise<Catalogue> {
  return (await fetch("data/prestocks.json")).json();
}

export async function loadHistory(): Promise<History> {
  return (await fetch("data/history.json")).json();
}

async function safeQuote(mint: string, multiplier: number): Promise<Quote | undefined> {
  return quoteBuy(mint, QUOTE_USD, multiplier).catch(() => undefined);
}

async function safeMultipliers(mints: string[], fallback: Record<string, number>): Promise<Record<string, number>> {
  return fetchMultipliers(mints, fetch, BROWSER_RPC).catch(() => fallback);
}

export async function loadLive(catalogue: Catalogue): Promise<Live> {
  const stocks = catalogue.prestocks;
  const mints = stocks.map((s) => s.contract_address);
  const multipliers = await safeMultipliers(mints, catalogue.multipliers);
  const [prices, quotes] = await Promise.all([livePrices(mints).catch(() => ({})), Promise.all(mints.map((m) => safeQuote(m, multipliers[m])))]);
  const bySymbol = stocks.map((s, i) => [s.symbol, quotes[i]]);

  return { prices, quotes: Object.fromEntries(bySymbol) };
}
