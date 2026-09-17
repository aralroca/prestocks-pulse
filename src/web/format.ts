export function money(n: number, digits = 2): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function compact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);

  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;

  return `${sign}$${abs.toFixed(0)}`;
}

export function pct(n: number, digits = 2): string {
  const sign = n > 0 ? "+" : "";

  return `${sign}${n.toFixed(digits)}%`;
}

export function tone(n: number): "up" | "down" | "fair" {
  if (n > 0) return "up";
  if (n < 0) return "down";

  return "fair";
}

export function ago(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);

  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 48) return `${Math.round(minutes / 60)} h ago`;

  return `${Math.round(minutes / 1440)} d ago`;
}
