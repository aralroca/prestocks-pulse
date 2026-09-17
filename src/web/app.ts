import { flows as computeFlows } from "../metrics.ts";
import { latest, snapshotBefore } from "../history.ts";
import { loadCatalogue, loadHistory, loadLive } from "./data.ts";
import { renderError, renderIndex, renderRadar, renderStats, renderTools } from "./render.ts";

const TOOLS: [string, string][] = [
  ["list_prestocks", "every token with prices, valuations, supply, mint and total AUM"],
  ["get_prestock", "company description, mint, prices and premium for one symbol"],
  ["premium_radar", "rank all PreStocks by premium vs SPV mark price"],
  ["quote_swap", "live executable Jupiter quote with premium, divergence alert and swap link"],
  ["pre8_index", "valuation-weighted index level and full series"],
  ["flows", "net creations/redemptions per token over N hours"],
  ["price_history", "hourly token, mark and supply series from the dataset"],
  ["build_basket", "allocate a USD budget across PreStocks by valuation"],
];

async function main(): Promise<void> {
  const [catalogue, history] = await Promise.all([loadCatalogue(), loadHistory()]);
  const start = snapshotBefore(history, 24);
  const end = latest(history);
  const flows = start && end ? computeFlows(start, end) : [];

  renderTools(TOOLS);
  renderStats(catalogue.prestocks, history, flows, catalogue.updatedAt);
  renderIndex(history);
  renderRadar(catalogue.prestocks, history, { prices: {}, quotes: {} }, flows);
  renderRadar(catalogue.prestocks, history, await loadLive(catalogue), flows);
}

main().catch((error: Error) => renderError(`Could not load data: ${error.message}`));
