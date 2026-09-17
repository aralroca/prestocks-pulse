import { describe, expect, test } from "bun:test";
import { aumUsd, basket, divergencePct, flows, indexLevel, indexSeries, isDiverged, premiumPct, premiumRadar, valuationWeights } from "../src/metrics.ts";
import { history, stocks } from "./fixtures.ts";

describe("premium", () => {
  test("premiumPct is token price relative to mark price", () => {
    expect(premiumPct(102, 100)).toBeCloseTo(2);
    expect(premiumPct(98, 100)).toBeCloseTo(-2);
  });

  test("divergence flags executable prices far from the issuer API price", () => {
    expect(divergencePct(120, 620)).toBeCloseTo(416.67);
    expect(isDiverged(120, 620)).toBe(true);
    expect(isDiverged(100, 105)).toBe(false);
  });

  test("premiumRadar sorts richest first and labels signals", () => {
    const radar = premiumRadar(stocks);

    expect(radar.map((r) => r.symbol)).toEqual(["SPACEX", "KALSHI", "OPENAI"]);
    expect(radar.map((r) => r.signal)).toEqual(["rich", "fair", "cheap"]);
  });
});

describe("index", () => {
  test("weights are valuation shares summing to 1", () => {
    const w = valuationWeights(history.snapshots[0]);

    expect(w.OPENAI).toBeCloseTo(0.5);
    expect(Object.values(w).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  test("index starts at 1000 and tracks weighted token returns", () => {
    const [base, , last] = history.snapshots;

    expect(indexLevel(base, base).level).toBeCloseTo(1000);
    // 0.5*1.10 + 0.4*0.90 + 0.1*1.0 = 1.01
    expect(indexLevel(base, last).level).toBeCloseTo(1010);
    expect(indexSeries(history).map((p) => Math.round(p.level))).toEqual([1000, 1015, 1010]);
  });

  test("indexSeries on empty history is empty", () => {
    expect(indexSeries({ version: 1, source: "x", snapshots: [] })).toEqual([]);
  });
});

describe("flows and basket", () => {
  test("flows derive net creations from supply deltas at mark price", () => {
    const [start, , end] = history.snapshots;
    const result = flows(start, end);

    expect(result[0]).toMatchObject({ symbol: "OPENAI", deltaSupply: 200, netFlowUsd: 200 * 102 });
    expect(result.find((f) => f.symbol === "KALSHI")?.netFlowUsd).toBe(-1000);
  });

  test("aum is token price times supply", () => {
    expect(aumUsd(stocks)).toBe(100 * 1000 + 50 * 2000 + 10 * 500);
  });

  test("basket allocates by valuation share", () => {
    const b = basket(stocks, 1000);

    expect(b.find((x) => x.symbol === "OPENAI")).toMatchObject({ usd: 500, units: 5 });
    expect(b.reduce((sum, x) => sum + x.usd, 0)).toBeCloseTo(1000);
  });
});
