import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchPreStocks, findStock } from "../prestocks.ts";
import { aumUsd, basket, divergencePct, flows, indexLevel, indexSeries, isDiverged, premiumRadar } from "../metrics.ts";
import { loadHistory, latest, seriesFor, snapshotBefore } from "../history.ts";
import { quoteBuy, quoteSell } from "../jupiter.ts";
import { fetchMultipliers } from "../solana.ts";
import { json, usd } from "./format.ts";
import { DIVERGENCE_ALERT, SPECS } from "./specs.ts";
import type { History } from "../types.ts";

type Deps = { fetchStocks: typeof fetchPreStocks; history: () => Promise<History>; quoteBuy: typeof quoteBuy; quoteSell: typeof quoteSell; multipliers: typeof fetchMultipliers };
type Side = "buy" | "sell";

export const defaultDeps: Deps = { fetchStocks: fetchPreStocks, history: () => loadHistory(), quoteBuy, quoteSell, multipliers: fetchMultipliers };

const NO_HISTORY = { error: "No history yet. Run `bun run snapshot` first." };

export function registerTools(server: McpServer, deps: Deps = defaultDeps): void {
  server.registerTool("list_prestocks", SPECS.list_prestocks, () => listPrestocks(deps));
  server.registerTool("get_prestock", SPECS.get_prestock, ({ symbol }) => getPrestock(deps, symbol));
  server.registerTool("premium_radar", SPECS.premium_radar, async () => json(premiumRadar(await deps.fetchStocks())));
  server.registerTool("pre8_index", SPECS.pre8_index, () => pre8Index(deps));
  server.registerTool("flows", SPECS.flows, ({ hours }) => flowsOver(deps, hours));
  server.registerTool("price_history", SPECS.price_history, ({ symbol, hours }) => priceHistory(deps, symbol, hours));
  server.registerTool("quote_swap", SPECS.quote_swap, ({ symbol, side, amount }) => quoteSwap(deps, symbol, side, amount));
  server.registerTool("build_basket", SPECS.build_basket, async ({ usd: budget }) => json({ usd: budget, positions: basket(await deps.fetchStocks(), budget) }));
}

async function multiplierFor(deps: Deps, mint: string): Promise<number> {
  return (await deps.multipliers([mint]))[mint];
}

async function listPrestocks(deps: Deps) {
  const stocks = await deps.fetchStocks();
  const rows = stocks.map(({ description: _d, image: _i, ...rest }) => rest);

  return json({ aumUsd: aumUsd(stocks), aum: usd(aumUsd(stocks)), count: stocks.length, prestocks: rows });
}

async function getPrestock(deps: Deps, symbol: string) {
  const stock = findStock(await deps.fetchStocks(), symbol);
  const [radar] = premiumRadar([stock]);
  const uiMultiplier = await multiplierFor(deps, stock.contract_address);

  return json({ ...stock, premiumPct: radar.premiumPct, signal: radar.signal, uiMultiplier, tokenStandard: "Token-2022 (ScaledUiAmount, transfer fee 0.5%)" });
}

async function pre8Index(deps: Deps) {
  const history = await deps.history();
  const [base] = history.snapshots;
  const last = latest(history);

  if (!base || !last) return json(NO_HISTORY);

  return json({ ...indexLevel(base, last), series: indexSeries(history) });
}

async function flowsOver(deps: Deps, hours: number) {
  const history = await deps.history();
  const start = snapshotBefore(history, hours);
  const end = latest(history);

  if (!start || !end) return json(NO_HISTORY);

  return json({ from: start.t, to: end.t, flows: flows(start, end) });
}

async function priceHistory(deps: Deps, symbol: string, hours: number) {
  const history = await deps.history();
  const cutoff = Date.now() - hours * 3_600_000;
  const series = seriesFor(history, symbol.toUpperCase()).filter((x) => new Date(x.t).getTime() >= cutoff);

  return json({ symbol: symbol.toUpperCase(), points: series.length, series });
}

async function quoteSwap(deps: Deps, symbol: string, side: Side, amount: number) {
  const stock = findStock(await deps.fetchStocks(), symbol);
  const multiplier = await multiplierFor(deps, stock.contract_address);
  const quote = side === "buy" ? await deps.quoteBuy(stock.contract_address, amount, multiplier) : await deps.quoteSell(stock.contract_address, amount, multiplier);
  const executablePremiumPct = (quote.executablePrice / stock.markPrice - 1) * 100;
  const divergenceVsApiPct = divergencePct(stock.tokenPrice, quote.executablePrice);
  const alert = isDiverged(stock.tokenPrice, quote.executablePrice) ? DIVERGENCE_ALERT : undefined;

  return json({ symbol: stock.symbol, apiTokenPrice: stock.tokenPrice, markPrice: stock.markPrice, ...quote, executablePremiumPct, divergenceVsApiPct, alert });
}
