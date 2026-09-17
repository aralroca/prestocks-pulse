import { describe, expect, test } from "bun:test";
import { appendSnapshot, emptyHistory, latest, loadHistory, seriesFor, snapshotBefore } from "../src/history.ts";
import { toSnapshot } from "../src/prestocks.ts";
import { history, stocks } from "./fixtures.ts";

describe("history", () => {
  test("toSnapshot keeps the compact per-token shape", () => {
    const snap = toSnapshot(stocks, new Date("2026-09-17T10:00:00Z"));

    expect(snap.t).toBe("2026-09-17T10:00:00.000Z");
    expect(snap.tokens.OPENAI).toEqual({ p: 100, m: 102, s: 1000, mv: 500e9 });
  });

  test("appendSnapshot is immutable and keeps order", () => {
    const snap = toSnapshot(stocks);
    const next = appendSnapshot(emptyHistory(), snap);

    expect(next.snapshots).toHaveLength(1);
    expect(latest(next)).toBe(snap);
    expect(emptyHistory().snapshots).toHaveLength(0);
  });

  test("snapshotBefore picks the newest snapshot at least N hours old", () => {
    expect(snapshotBefore(history, 12)?.t).toBe("2026-09-17T12:00:00.000Z");
    expect(snapshotBefore(history, 24)?.t).toBe("2026-09-17T00:00:00.000Z");
    expect(snapshotBefore(history, 999)?.t).toBe("2026-09-17T00:00:00.000Z");
    expect(snapshotBefore(emptyHistory(), 1)).toBeUndefined();
  });

  test("loadHistory falls back to the published dataset, then to empty", async () => {
    const remote = (async () => new Response(JSON.stringify(history))) as unknown as typeof fetch;
    const broken = (async () => new Response("nope", { status: 500 })) as unknown as typeof fetch;

    expect((await loadHistory("/nonexistent/history.json", "https://example.test/h.json", remote)).snapshots).toHaveLength(3);
    expect((await loadHistory("/nonexistent/history.json", "https://example.test/h.json", broken)).snapshots).toHaveLength(0);
  });

  test("seriesFor extracts one token's timeline", () => {
    const series = seriesFor(history, "OPENAI");

    expect(series.map((x) => x.p)).toEqual([100, 105, 110]);
    expect(seriesFor(history, "NOPE")).toEqual([]);
  });
});
