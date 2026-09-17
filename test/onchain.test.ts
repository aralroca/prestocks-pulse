import { describe, expect, test } from "bun:test";
import { effectiveMultiplier, fetchMultipliers } from "../src/solana.ts";
import { quoteBuy, quoteSell } from "../src/jupiter.ts";

const split = { multiplier: "1", newMultiplier: "5", newMultiplierEffectiveTimestamp: 1_781_065_800 };

function fakeFetch(body: unknown): typeof fetch {
  return (async () => new Response(JSON.stringify(body))) as unknown as typeof fetch;
}

describe("ScaledUiAmount", () => {
  test("uses the new multiplier only once its timestamp has passed", () => {
    expect(effectiveMultiplier(undefined)).toBe(1);
    expect(effectiveMultiplier(split, split.newMultiplierEffectiveTimestamp - 1)).toBe(1);
    expect(effectiveMultiplier(split, split.newMultiplierEffectiveTimestamp)).toBe(5);
    expect(effectiveMultiplier({ multiplier: "1", newMultiplier: "1", newMultiplierEffectiveTimestamp: 0 })).toBe(1);
  });

  test("fetchMultipliers parses getMultipleAccounts and defaults missing accounts to 1", async () => {
    const value = [{ data: { parsed: { info: { extensions: [{ extension: "scaledUiAmountConfig", state: split }] } } } }, null];
    const result = await fetchMultipliers(["MintA", "MintB"], fakeFetch({ result: { value } }));

    expect(result).toEqual({ MintA: 5, MintB: 1 });
  });
});

describe("Jupiter quotes", () => {
  test("buy scales raw output by the UI multiplier", async () => {
    const quote = await quoteBuy("MintA", 250, 5, fakeFetch({ inAmount: "250000000", outAmount: "401355497", priceImpactPct: "0.03" }));

    expect(quote.tokens).toBeCloseTo(2.0068, 3);
    expect(quote.executablePrice).toBeCloseTo(124.58, 1);
    expect(quote.swapUrl).toBe("https://jup.ag/swap/USDC-MintA");
  });

  test("sell converts UI tokens to raw input before quoting", async () => {
    const seen: string[] = [];
    const fetchFn = (async (url: string) => (seen.push(url), new Response(JSON.stringify({ inAmount: "0", outAmount: "604028795", priceImpactPct: "0" })))) as unknown as typeof fetch;
    const quote = await quoteSell("MintA", 5, 5, fetchFn);

    expect(seen[0]).toContain("amount=1000000000");
    expect(quote.executablePrice).toBeCloseTo(120.81, 1);
  });
});
