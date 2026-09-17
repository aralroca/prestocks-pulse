export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDC_DECIMALS = 6;
const PRESTOCK_DECIMALS = 9;
const JUP = "https://lite-api.jup.ag";

export type Quote = {
  side: "buy" | "sell";
  usd: number;
  tokens: number;
  executablePrice: number;
  priceImpactPct: number;
  uiMultiplier: number;
  swapUrl: string;
};

export type LivePrice = { usdPrice: number; priceChange24h: number; liquidity: number };

type RawQuote = { inAmount: string; outAmount: string; priceImpactPct: string };

function quoteUrl(inputMint: string, outputMint: string, amount: number): string {
  return `${JUP}/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50`;
}

async function rawQuote(inputMint: string, outputMint: string, amount: number, fetchFn: typeof fetch): Promise<RawQuote> {
  const res = await fetchFn(quoteUrl(inputMint, outputMint, amount));

  if (!res.ok) throw new Error(`Jupiter quote ${res.status}`);

  return (await res.json()) as RawQuote;
}

export function swapUrl(mint: string, side: "buy" | "sell"): string {
  return side === "buy" ? `https://jup.ag/swap/USDC-${mint}` : `https://jup.ag/swap/${mint}-USDC`;
}

/** Jupiter amounts are raw Token-2022 units; PreStocks apply a ScaledUiAmount multiplier (splits), so UI tokens = raw × multiplier. */
export async function quoteBuy(mint: string, usd: number, uiMultiplier = 1, fetchFn = fetch): Promise<Quote> {
  const raw = await rawQuote(USDC_MINT, mint, Math.round(usd * 10 ** USDC_DECIMALS), fetchFn);
  const tokens = (Number(raw.outAmount) / 10 ** PRESTOCK_DECIMALS) * uiMultiplier;

  return { side: "buy", usd, tokens, executablePrice: usd / tokens, priceImpactPct: Number(raw.priceImpactPct), uiMultiplier, swapUrl: swapUrl(mint, "buy") };
}

export async function quoteSell(mint: string, tokens: number, uiMultiplier = 1, fetchFn = fetch): Promise<Quote> {
  const rawAmount = Math.round((tokens / uiMultiplier) * 10 ** PRESTOCK_DECIMALS);
  const raw = await rawQuote(mint, USDC_MINT, rawAmount, fetchFn);
  const usd = Number(raw.outAmount) / 10 ** USDC_DECIMALS;

  return { side: "sell", usd, tokens, executablePrice: usd / tokens, priceImpactPct: Number(raw.priceImpactPct), uiMultiplier, swapUrl: swapUrl(mint, "sell") };
}

export async function livePrices(mints: string[], fetchFn = fetch): Promise<Record<string, LivePrice>> {
  const res = await fetchFn(`${JUP}/price/v3?ids=${mints.join(",")}`);

  if (!res.ok) throw new Error(`Jupiter price ${res.status}`);

  return (await res.json()) as Record<string, LivePrice>;
}
