type XY = { x: number; y: number };

function scale(values: number[], width: number, height: number, pad = 2): XY[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;

  return values.map((v, i) => ({ x: pad + i * step, y: height - pad - ((v - min) / span) * (height - pad * 2) }));
}

function path(points: XY[]): string {
  return points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

export function sparkline(values: number[], color: string, width = 110, height = 32): string {
  if (values.length < 2) return `<svg width="${width}" height="${height}"><text x="0" y="20" fill="#8b93a7" font-size="11">no history</text></svg>`;

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><path d="${path(scale(values, width, height))}" fill="none" stroke="${color}" stroke-width="1.6" /></svg>`;
}

export function lineChart(values: number[], labels: string[], color: string, width = 1100, height = 220): string {
  if (values.length < 2) return `<svg viewBox="0 0 ${width} ${height}"><text x="0" y="30" fill="#8b93a7" font-size="14">The index needs at least two hourly snapshots. Come back soon.</text></svg>`;

  const points = scale(values, width, height, 24);
  const area = `${path(points)} L${points.at(-1)!.x},${height - 24} L${points[0].x},${height - 24} Z`;
  const first = labels[0].slice(0, 16).replace("T", " ");
  const last = labels.at(-1)!.slice(0, 16).replace("T", " ");

  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><path d="${area}" fill="${color}" opacity="0.12" /><path d="${path(points)}" fill="none" stroke="${color}" stroke-width="2" /><text x="24" y="${height - 6}" fill="#8b93a7" font-size="11">${first} UTC</text><text x="${width - 24}" y="${height - 6}" fill="#8b93a7" font-size="11" text-anchor="end">${last} UTC</text><text x="24" y="16" fill="#8b93a7" font-size="11">min ${Math.min(...values).toFixed(1)}</text><text x="${width - 24}" y="16" fill="#8b93a7" font-size="11" text-anchor="end">max ${Math.max(...values).toFixed(1)}</text></svg>`;
}
