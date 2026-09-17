export const SOLANA_RPC = "https://api.mainnet-beta.solana.com";
/** The official RPC rejects browser origins; this public node allows CORS. */
export const BROWSER_RPC = "https://solana-rpc.publicnode.com";

export type ScaledUiAmountConfig = { multiplier: string; newMultiplier: string; newMultiplierEffectiveTimestamp: number };

type Extension = { extension: string; state?: ScaledUiAmountConfig };
type ParsedMint = { data?: { parsed?: { info?: { extensions?: Extension[] } } } } | null;

/** Token-2022 ScaledUiAmount: the UI multiplier that applies right now (splits schedule a new one). */
export function effectiveMultiplier(config: ScaledUiAmountConfig | undefined, nowSeconds = Date.now() / 1000): number {
  if (!config) return 1;

  const scheduled = config.newMultiplierEffectiveTimestamp > 0 && nowSeconds >= config.newMultiplierEffectiveTimestamp;

  return Number(scheduled ? config.newMultiplier : config.multiplier) || 1;
}

function multiplierOf(account: ParsedMint): number {
  const extensions = account?.data?.parsed?.info?.extensions ?? [];
  const scaled = extensions.find((e) => e.extension === "scaledUiAmountConfig");

  return effectiveMultiplier(scaled?.state);
}

export async function fetchMultipliers(mints: string[], fetchFn = fetch, rpc = SOLANA_RPC): Promise<Record<string, number>> {
  const body = { jsonrpc: "2.0", id: 1, method: "getMultipleAccounts", params: [mints, { encoding: "jsonParsed" }] };
  const res = await fetchFn(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  if (!res.ok) throw new Error(`Solana RPC ${res.status}`);

  const { result } = (await res.json()) as { result: { value: ParsedMint[] } };

  return Object.fromEntries(mints.map((mint, i) => [mint, multiplierOf(result.value[i])]));
}
