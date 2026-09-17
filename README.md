# 📡 PreStocks Pulse

**The open data layer for tokenized pre-IPO stocks on Solana.**
Premium radar · PRE8 index · creation/redemption flows · split-aware executable prices · an MCP server so AI agents can research and trade PreStocks.

- **Live dashboard:** https://aralroca.github.io/prestocks-pulse/
- **Open dataset (hourly, JSON):** https://aralroca.github.io/prestocks-pulse/data/history.json
- **MCP server:** `npx -y github:aralroca/prestocks-pulse` (Node ≥ 23.6 or Bun)

Built for the [Stocklana](https://hackathons.solana.com/hackathons/stocklana) hackathon, *Best Use of PreStocks* bounty.

## The problem

[PreStocks](https://prestocks.com) tokens (OPENAI, ANTHROPIC, SPACEX, ANDURIL, …) trade 24/7 on Solana, but a holder has no easy way to answer the questions a Bloomberg terminal answers for public stocks:

1. **Am I paying a premium?** The token price and the SPV *mark price* (fair value) diverge — sometimes by double digits.
2. **What price will I actually get?** The issuer API price is an indicative number; the executable price lives on Jupiter and depends on liquidity.
3. **Is money flowing in or out?** There is no history API, so nobody can see supply changes (creations/redemptions), the pre-IPO equivalent of ETF fund flows.
4. **Can my AI agent use any of this?** Nothing exposes PreStocks to Claude, Cursor or any MCP client.

## What Pulse does

| Feature | How |
| --- | --- |
| **Open dataset** | A GitHub Action snapshots the [PreStocks API](https://prestocks.com/api/prestocks) every hour into `docs/data/history.json` (token price, mark price, supply, valuation per token). Anyone can consume it. |
| **Premium / discount radar** | Ranks every PreStock by `tokenPrice / markPrice − 1` and labels it `rich`, `fair` or `cheap`. |
| **Executable prices** | Live Jupiter quotes for 100 USDC per token, with price impact and an *executable premium* vs mark. |
| **Split-aware quotes** | PreStocks are Token-2022 mints with the `ScaledUiAmount` extension. Jupiter returns raw units, so OPENAI (×1.486) and SPACEX (×5) look 49 % / 400 % too expensive unless you read the multiplier on-chain. Pulse does. |
| **Divergence alerts** | If the executable price drifts > 10 % from the issuer API price, the row is flagged: stale data or a corporate action (e.g. SpaceX's post-IPO conversion window). |
| **PRE8 index** | Valuation-weighted index of all PreStocks, base 1000 at the first snapshot, with its full series. |
| **Creation / redemption flows** | Supply deltas between snapshots valued at mark price: net inflows per token, like ETF flows. |
| **PRE8 baskets** | Allocate a USD budget across all PreStocks by valuation. |
| **MCP server** | Eight tools so any agent can list, research, rank, quote, build baskets and read history in natural language. |
| **Trade** | Every row links to the right Jupiter swap pair. |

## Use it from your AI agent

Claude Desktop / Claude Code / Cursor (`mcp.json`):

```json
{
  "mcpServers": {
    "prestocks-pulse": { "command": "npx", "args": ["-y", "github:aralroca/prestocks-pulse"] }
  }
}
```

Claude Code one-liner:

```bash
claude mcp add prestocks-pulse -- npx -y github:aralroca/prestocks-pulse
```

Then ask things like:

> *"Which PreStocks trade at a discount to their mark price right now?"*
> *"Quote 500 USDC of ANTHROPIC and tell me the executable premium."*
> *"Build a $2,000 PRE8 basket."*
> *"Did OPENAI see net creations or redemptions in the last 24 hours?"*

### Tools

| Tool | Description |
| --- | --- |
| `list_prestocks` | Every token with prices, valuations, supply, mint and total AUM |
| `get_prestock` | Company description, mint, prices, premium and the on-chain split multiplier |
| `premium_radar` | Rank all PreStocks by premium vs SPV mark price |
| `quote_swap` | Live executable Jupiter quote (buy with USDC / sell to USDC) with premium, divergence alert and swap link |
| `pre8_index` | Valuation-weighted index level and full series |
| `flows` | Net creations/redemptions per token over N hours |
| `price_history` | Hourly token price, mark price and supply series |
| `build_basket` | Allocate a USD budget across PreStocks by valuation |

The server reads the local dataset when run inside the repo and the published dataset otherwise, so it works from any directory.

## Dataset schema

`docs/data/history.json`

```jsonc
{
  "version": 1,
  "source": "https://prestocks.com/api/prestocks",
  "snapshots": [
    {
      "t": "2026-09-17T19:17:51.560Z",
      "tokens": {
        "OPENAI": { "p": 1045.55, "m": 965.78, "s": 2826.5, "mv": 1541000000000 }
        // p = token price, m = mark price, s = supply, mv = mark valuation (USD)
      }
    }
  ]
}
```

`docs/data/prestocks.json` holds the latest full catalogue (names, descriptions, logos, mints) plus the `ScaledUiAmount` multipliers read from Solana.

## Architecture

```
prestocks.com/api ──hourly──▶ GitHub Action ──▶ docs/data/*.json ──▶ GitHub Pages
                                                      │                    │
Jupiter (price v3 + quote) ◀─────── browser ◀─────────┘         dashboard (docs/)
Solana RPC (Token-2022 ScaledUiAmount) ◀── MCP server (src/mcp) ◀── Claude / Cursor
```

- `src/metrics.ts` — pure analytics (premium, index, flows, basket, divergence), shared by the dashboard and the MCP server.
- `src/jupiter.ts` — Jupiter price + quote client, multiplier-aware.
- `src/solana.ts` — reads `scaledUiAmountConfig` from the mints.
- `src/history.ts` — dataset read/append (local file or published URL).
- `src/mcp/` — MCP server (`@modelcontextprotocol/sdk`, stdio).
- `src/web/` — dashboard, bundled with `bun build` into `docs/app.js`.

## Development

```bash
bun install
bun test              # unit + MCP end-to-end (in-memory transport)
bun run snapshot      # append one snapshot to docs/data
bun run build         # bundle the dashboard
bun run dev           # build + serve docs/ locally
bun run mcp           # run the MCP server on stdio
```

## Why Solana

PreStocks only exist on Solana: Token-2022 mints with transfer fees, permanent delegate and `ScaledUiAmount` for corporate actions, traded on Jupiter-routed venues (Meteora DLMM, Manifest, Whirlpool). Pulse reads those primitives directly, which is what makes split-aware executable prices possible.

## Disclaimer

Not investment advice. PreStocks provide economic exposure only and are not available to U.S. persons; read [prestocks.com](https://prestocks.com) before trading. Open-source components: `@modelcontextprotocol/sdk`, `zod`.

## License

MIT
