import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/mcp/server.ts";
import { history, stocks } from "./fixtures.ts";

const quote = { side: "buy" as const, usd: 100, tokens: 0.98, executablePrice: 102.04, priceImpactPct: 0, uiMultiplier: 1, swapUrl: "https://jup.ag/swap/USDC-MintOPENAI" };
const deps = { fetchStocks: async () => stocks, history: async () => history, quoteBuy: async () => quote, quoteSell: async () => ({ ...quote, side: "sell" as const }), multipliers: async (mints: string[]) => Object.fromEntries(mints.map((m) => [m, 1])) };

async function connect() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0.0.0" });

  await createServer(deps).connect(serverTransport);
  await client.connect(clientTransport);

  return client;
}

async function call(client: Client, name: string, args: Record<string, unknown> = {}) {
  const result = await client.callTool({ name, arguments: args });
  const [first] = result.content as { text: string }[];

  return { isError: result.isError, data: result.isError ? first.text : JSON.parse(first.text) };
}

describe("MCP server", () => {
  test("exposes the eight analysis tools", async () => {
    const client = await connect();
    const { tools } = await client.listTools();

    expect(tools.map((t) => t.name).sort()).toEqual(["build_basket", "flows", "get_prestock", "list_prestocks", "pre8_index", "premium_radar", "price_history", "quote_swap"]);
  });

  test("list, get and radar use live stocks", async () => {
    const client = await connect();

    expect((await call(client, "list_prestocks")).data.count).toBe(3);
    expect((await call(client, "get_prestock", { symbol: "openai" })).data.signal).toBe("cheap");
    expect((await call(client, "premium_radar")).data[0].symbol).toBe("SPACEX");
  });

  test("index, flows and history use the dataset", async () => {
    const client = await connect();

    expect(Math.round((await call(client, "pre8_index")).data.level)).toBe(1010);
    expect((await call(client, "flows", { hours: 24 })).data.flows[0].symbol).toBe("OPENAI");
    expect((await call(client, "price_history", { symbol: "OPENAI", hours: 24 * 365 })).data.points).toBe(3);
  });

  test("quote reports executable premium vs mark and unknown symbols error", async () => {
    const client = await connect();
    const { data } = await call(client, "quote_swap", { symbol: "OPENAI", side: "buy", amount: 100 });

    expect(data.executablePremiumPct).toBeCloseTo(0.04, 1);
    expect(data.alert).toBeUndefined();
    expect((await call(client, "get_prestock", { symbol: "SPACEX" })).data.uiMultiplier).toBe(1);
    const unknown = await call(client, "get_prestock", { symbol: "NOPE" });

    expect(unknown.isError).toBe(true);
    expect(unknown.data).toContain("Known: OPENAI, SPACEX, KALSHI");
  });
});
