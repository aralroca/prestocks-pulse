import type { Flow, History, PreStock } from "../types.ts";
import { INDEX_BASE_LEVEL, aumUsd, divergencePct, indexLevel, indexSeries, isDiverged, premiumPct, valuationWeights } from "../metrics.ts";
import { seriesFor } from "../history.ts";
import { lineChart, sparkline } from "./charts.ts";
import { ago, compact, money, pct, tone } from "./format.ts";
import type { Live } from "./data.ts";

const UP = "#0a7d2f";
const DOWN = "#b63a2e";

function el(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function badge(value: number, digits = 2): string {
  return `<span class="badge ${tone(value)}">${pct(value, digits)}</span>`;
}

function executableCells(stock: PreStock, live: Live): string {
  const quote = live.quotes[stock.symbol];

  if (!quote) return `<td class="muted">n/a</td><td class="muted">n/a</td>`;

  const diverged = isDiverged(stock.tokenPrice, quote.executablePrice);
  const alert = diverged ? ` <span class="badge warn" title="Executable price is ${pct(divergencePct(stock.tokenPrice, quote.executablePrice), 0)} away from the API price: stale data or corporate action (e.g. IPO conversion). Check prestocks.com.">⚠ ${pct(divergencePct(stock.tokenPrice, quote.executablePrice), 0)} vs API</span>` : "";

  const split = quote.uiMultiplier !== 1 ? ` <span class="badge fair" title="Token-2022 ScaledUiAmount multiplier (split). Quotes are per UI token.">×${quote.uiMultiplier}</span>` : "";

  return `<td>${money(quote.executablePrice)}${split}${alert}</td><td>${badge(premiumPct(quote.executablePrice, stock.markPrice))}</td>`;
}

function liveCells(stock: PreStock, live: Live): string {
  const price = live.prices[stock.contract_address];

  if (!price) return `<td class="muted">n/a</td><td class="muted">n/a</td>`;

  return `<td>${badge(price.priceChange24h)}</td><td>${compact(price.liquidity)}</td>`;
}

function flowCell(flow: Flow | undefined): string {
  if (!flow || flow.deltaSupply === 0) return `<td class="muted">0</td>`;

  return `<td class="${tone(flow.netFlowUsd)}">${compact(flow.netFlowUsd)}</td>`;
}

function nameCell(stock: PreStock): string {
  return `<td class="name"><img src="${stock.image}" alt="" loading="lazy" /><a href="${stock.external_url}" target="_blank" rel="noopener">${stock.symbol}</a></td>`;
}

function row(stock: PreStock, history: History, live: Live, flow: Flow | undefined): string {
  const premium = premiumPct(stock.tokenPrice, stock.markPrice);
  const trend = seriesFor(history, stock.symbol).map((x) => x.p);
  const tradeUrl = live.quotes[stock.symbol]?.swapUrl ?? `https://jup.ag/swap/USDC-${stock.contract_address}`;

  return `<tr>${nameCell(stock)}<td>${money(stock.tokenPrice)}</td><td>${money(stock.markPrice)}</td><td>${badge(premium)}</td>
    ${executableCells(stock, live)}${liveCells(stock, live)}${flowCell(flow)}<td>${sparkline(trend, premium >= 0 ? UP : DOWN)}</td>
    <td><a class="trade" href="${tradeUrl}" target="_blank" rel="noopener">Trade</a></td></tr>`;
}

export function renderRadar(stocks: PreStock[], history: History, live: Live, flows: Flow[]): void {
  const sorted = [...stocks].sort((a, b) => premiumPct(b.tokenPrice, b.markPrice) - premiumPct(a.tokenPrice, a.markPrice));
  const rows = sorted.map((s) => row(s, history, live, flows.find((f) => f.symbol === s.symbol)));

  el("radar").querySelector("tbody")!.innerHTML = rows.join("");
}

function currentLevel(history: History): number {
  const [base] = history.snapshots;
  const last = history.snapshots.at(-1);

  return base && last ? indexLevel(base, last).level : INDEX_BASE_LEVEL;
}

export function renderStats(stocks: PreStock[], history: History, flows: Flow[], updatedAt: string): void {
  const level = currentLevel(history);
  const net = flows.reduce((sum, f) => sum + f.netFlowUsd, 0);

  el("index-level").textContent = level.toFixed(2);
  el("index-change").innerHTML = badge((level / INDEX_BASE_LEVEL - 1) * 100) + " since base";
  el("aum").textContent = compact(aumUsd(stocks));
  el("flows").innerHTML = `<span class="${tone(net)}">${compact(net)}</span>`;
  el("snapshots").textContent = `${history.snapshots.length} snapshots`;
  el("updated").textContent = `updated ${ago(updatedAt)} · hourly`;
}

export function renderIndex(history: History): void {
  const series = indexSeries(history);
  const [base] = history.snapshots;
  const weights = base ? valuationWeights(base) : {};
  const chips = Object.entries(weights).sort((a, b) => b[1] - a[1]).map(([sym, w]) => `<span>${sym} ${(w * 100).toFixed(1)}%</span>`);

  el("index-chart").innerHTML = lineChart(series.map((p) => p.level), series.map((p) => p.t), "#2567ff");
  el("weights").innerHTML = chips.join("");
}

export function renderTools(tools: [string, string][]): void {
  el("tools").innerHTML = tools.map(([name, desc]) => `<li><code>${name}</code> — ${desc}</li>`).join("");
}

export function renderError(message: string): void {
  el("radar").querySelector("tbody")!.innerHTML = `<tr><td colspan="11" class="down">${message}</td></tr>`;
}
