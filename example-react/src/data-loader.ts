import type { Bar } from 'oakscriptjs';

export interface CandlestickData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

function parseDate(dateStr: string): number {
  const date = new Date(dateStr);
  return Math.floor(date.getTime() / 1000);
}

export function parseCSV(content: string): Bar[] {
  const lines = content.trim().split('\n');
  const bars: Bar[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length < 6) continue;

    const dateStr = parts[0];
    const openStr = parts[1];
    const highStr = parts[2];
    const lowStr = parts[3];
    const closeStr = parts[4];
    const volumeStr = parts[5];

    if (!dateStr || !openStr || !highStr || !lowStr || !closeStr) continue;

    const time = parseDate(dateStr);
    const open = parseFloat(openStr);
    const high = parseFloat(highStr);
    const low = parseFloat(lowStr);
    const close = parseFloat(closeStr);
    const volume = volumeStr ? parseFloat(volumeStr) : 0;

    if (!isNaN(time) && !isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close)) {
      bars.push({ time, open, high, low, close, volume: volume || 0 });
    }
  }

  bars.sort((a, b) => a.time - b.time);
  return bars;
}

export function toCandlestickData(bars: Bar[]): CandlestickData[] {
  return bars.map(bar => ({
    time: bar.time,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
  }));
}

export async function loadCSV(url: string): Promise<Bar[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load CSV: ${response.statusText}`);
  }
  const content = await response.text();
  return parseCSV(content);
}
