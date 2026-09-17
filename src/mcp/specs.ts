import { z } from "zod";

const symbol = z.string().describe("PreStock symbol, e.g. OPENAI, SPACEX, ANTHROPIC");
const hours = z.number().int().positive().default(24).describe("Lookback window in hours");

export const SPECS = {
  list_prestocks: {
    title: "List PreStocks",
    description: "All PreStocks tokens with token price, SPV mark price, valuations, supply and Solana mint address. Total AUM included.",
  },
  get_prestock: {
    title: "Get PreStock",
    description: "Full detail of one PreStock: company description, mint, prices, valuations, premium vs mark, and the on-chain ScaledUiAmount multiplier (split factor).",
    inputSchema: { symbol },
  },
  premium_radar: {
    title: "Premium / discount radar",
    description: "Ranks every PreStock by premium (token price vs SPV mark price). 'rich' trades above fair value, 'cheap' below (>1% band).",
  },
  pre8_index: {
    title: "PRE8 index",
    description: "Valuation-weighted index of all PreStocks (base 1000 at first snapshot) with its full series from the open history dataset.",
  },
  flows: {
    title: "Creation / redemption flows",
    description: "Net token creations (positive) or redemptions (negative) per PreStock over a window, derived from supply changes and valued at mark price. Like ETF fund flows.",
    inputSchema: { hours },
  },
  price_history: {
    title: "Price history",
    description: "Hourly series of token price, mark price and supply for one PreStock from the open dataset.",
    inputSchema: { symbol, hours },
  },
  quote_swap: {
    title: "Quote a swap on Jupiter",
    description:
      "Live executable quote on Solana via Jupiter for buying a PreStock with USDC or selling it for USDC. Split-aware: reads the Token-2022 ScaledUiAmount multiplier on-chain so prices are per UI token. Returns executable price, price impact, premium of the executable price vs mark, divergence vs the issuer API price (stale-data / corporate-action alert), and a jup.ag link to execute.",
    inputSchema: {
      symbol,
      side: z.enum(["buy", "sell"]).default("buy"),
      amount: z.number().positive().describe("USD amount to spend when buying; token units when selling"),
    },
  },
  build_basket: {
    title: "Build a PRE8 basket",
    description: "Allocates a USD budget across all PreStocks weighted by company valuation, returning USD and token units per position.",
    inputSchema: { usd: z.number().positive().describe("Budget in USD") },
  },
};

export const DIVERGENCE_ALERT =
  "Executable price diverges from the issuer API price: data may be stale or a corporate action (e.g. IPO conversion) may be in progress. Check prestocks.com before trading.";
