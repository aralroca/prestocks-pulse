import { fetchPreStocks, toSnapshot } from "./prestocks.ts";
import { appendSnapshot, loadHistory, saveCatalogue, saveHistory } from "./history.ts";
import { premiumRadar } from "./metrics.ts";
import { fetchMultipliers } from "./solana.ts";

const stocks = await fetchPreStocks();
const snapshot = toSnapshot(stocks);
const history = appendSnapshot(await loadHistory(), snapshot);

await saveHistory(history);
await saveCatalogue(stocks, await fetchMultipliers(stocks.map((s) => s.contract_address)));

const lines = premiumRadar(stocks).map((p) => `${p.symbol.padEnd(11)} ${p.premiumPct.toFixed(2).padStart(7)}%  ${p.signal}`);

console.log(`snapshot ${snapshot.t} (${history.snapshots.length} total)\n${lines.join("\n")}`);
