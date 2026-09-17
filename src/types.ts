export type PreStock = {
  name: string;
  symbol: string;
  description: string;
  image: string;
  external_url: string;
  contract_address: string;
  markPrice: number;
  markValuation: number;
  tokenPrice: number;
  impliedValuation: number;
  supply: number;
};

export type Point = {
  p: number; // token price (USD)
  m: number; // mark price (USD, SPV fair value)
  s: number; // circulating supply (tokens)
  mv: number; // mark valuation of the company (USD)
};

export type Snapshot = {
  t: string; // ISO timestamp
  tokens: Record<string, Point>;
};

export type History = {
  version: 1;
  source: string;
  snapshots: Snapshot[];
};

export type Premium = {
  symbol: string;
  tokenPrice: number;
  markPrice: number;
  premiumPct: number;
  signal: "rich" | "cheap" | "fair";
};

export type Flow = {
  symbol: string;
  supplyStart: number;
  supplyEnd: number;
  deltaSupply: number;
  netFlowUsd: number;
};

export type IndexLevel = {
  level: number;
  base: string;
  latest: string;
  weights: Record<string, number>;
};
