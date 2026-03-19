/**
 * Standalone Ichimoku Cloud chart using lightweight-charts-react-components.
 * Demonstrates how to render the Ichimoku Cloud fills between Span A and Span B.
 */

import { useMemo, useRef, useEffect } from 'react';
import {
  Chart,
  CandlestickSeries,
  LineSeries,
  SeriesPrimitive,
  TimeScale,
  TimeScaleFitContentTrigger,
} from 'lightweight-charts-react-components';
import type { Time, CandlestickData, LineData } from 'lightweight-charts';
import { ColorType } from 'lightweight-charts';
import type { Bar } from 'oakscriptjs';
import { IchimokuCloud } from '@lib/standard/ichimoku';
import { toCandlestickData } from '../data-loader';
import { PlotFillPrimitive } from '../primitives';
import type { PlotFillBar } from '../primitives';

// ─── Chart theme ────────────────────────────────────────────────────────────

const CHART_OPTIONS = {
  layout: {
    background: { type: ColorType.Solid as const, color: '#1e222d' },
    textColor: '#d1d4dc',
  },
  grid: {
    vertLines: { color: '#2b2b43' },
    horzLines: { color: '#2b2b43' },
  },
  crosshair: { mode: 1 as const },
  rightPriceScale: { borderColor: '#2b2b43' },
};

const CANDLE_OPTIONS = {
  upColor: '#26a69a',
  downColor: '#ef5350',
  borderVisible: false,
  wickUpColor: '#26a69a',
  wickDownColor: '#ef5350',
};

const INVISIBLE_LINE = {
  color: 'transparent',
  lineVisible: false,
  lastValueVisible: false,
  priceLineVisible: false,
  crosshairMarkerVisible: false,
};

// ─── Cloud fill primitive wrapper ───────────────────────────────────────────

function CloudFill({ bars, color }: { bars: PlotFillBar[]; color: string }) {
  const primRef = useRef(new PlotFillPrimitive());

  useEffect(() => {
    primRef.current.setData(bars, color);
  }, [bars, color]);

  // Anchor data so the price scale includes the fill range
  const anchorData = useMemo(
    () => bars.map(b => ({ time: b.time as unknown as Time, value: b.upper })),
    [bars],
  );

  return (
    <LineSeries data={anchorData as LineData<Time>[]} options={INVISIBLE_LINE}>
      <SeriesPrimitive plugin={primRef.current} />
    </LineSeries>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

interface IchimokuChartProps {
  bars: Bar[];
}

export default function IchimokuChart({ bars }: IchimokuChartProps) {
  // 1. Calculate indicator
  const ichimoku = useMemo(() => {
    if (bars.length === 0) return null;
    return IchimokuCloud.calculate(bars);
  }, [bars]);

  // 2. Prepare candlestick data
  const candleData = useMemo(
    () => toCandlestickData(bars) as CandlestickData<Time>[],
    [bars],
  );

  // 3. Prepare line series data (filter NaN)
  const conversionData = useMemo(
    () => filterValid(ichimoku?.plots['plot0']),
    [ichimoku],
  );
  const baseData = useMemo(
    () => filterValid(ichimoku?.plots['plot1']),
    [ichimoku],
  );
  const laggingData = useMemo(
    () => filterValid(ichimoku?.plots['plot2']),
    [ichimoku],
  );
  const spanAData = useMemo(
    () => filterValid(ichimoku?.plots['plot3']),
    [ichimoku],
  );
  const spanBData = useMemo(
    () => filterValid(ichimoku?.plots['plot4']),
    [ichimoku],
  );

  // 4. Build cloud fills from the result.fills
  //    fill[0]: plot5 (Lead A Bullish) vs plot4 (Span B) → green
  //    fill[1]: plot6 (Lead A Bearish) vs plot4 (Span B) → red
  const { bullishBars, bearishBars } = useMemo(() => {
    if (!ichimoku?.fills) return { bullishBars: [], bearishBars: [] };

    const plot4 = ichimoku.plots['plot4'] as Array<{ time: number; value: number }>;
    const plot5 = ichimoku.plots['plot5'] as Array<{ time: number; value: number }>;
    const plot6 = ichimoku.plots['plot6'] as Array<{ time: number; value: number }>;

    const buildFillBars = (
      p1: Array<{ time: number; value: number }>,
      p2: Array<{ time: number; value: number }>,
    ): PlotFillBar[] => {
      const p2Map = new Map(p2.map(d => [d.time, d.value]));
      const result: PlotFillBar[] = [];
      for (const d1 of p1) {
        const v1 = d1.value;
        const v2 = p2Map.get(d1.time);
        if (v1 == null || v2 == null || Number.isNaN(v1) || Number.isNaN(v2)) continue;
        result.push({
          time: d1.time,
          upper: Math.max(v1, v2),
          lower: Math.min(v1, v2),
        });
      }
      return result;
    };

    return {
      bullishBars: buildFillBars(plot5, plot4),
      bearishBars: buildFillBars(plot6, plot4),
    };
  }, [ichimoku]);

  // Resolve fill colors with transparency from the indicator's fill config
  const bullishColor = useMemo(() => {
    const fill = ichimoku?.fills?.[0];
    if (!fill) return '#43A04719'; // fallback
    const transp = fill.options?.transp ?? 90;
    const alpha = Math.round((1 - transp / 100) * 255);
    return (fill.options?.color ?? '#43A047') + alpha.toString(16).padStart(2, '0');
  }, [ichimoku]);

  const bearishColor = useMemo(() => {
    const fill = ichimoku?.fills?.[1];
    if (!fill) return '#F4433619';
    const transp = fill.options?.transp ?? 90;
    const alpha = Math.round((1 - transp / 100) * 255);
    return (fill.options?.color ?? '#F44336') + alpha.toString(16).padStart(2, '0');
  }, [ichimoku]);

  if (bars.length === 0) {
    return <div className="loading">Loading chart data...</div>;
  }

  return (
    <div id="chart-container">
      <Chart
        options={CHART_OPTIONS}
        containerProps={{ style: { width: '100%', height: '100%' } }}
      >
        {/* Price candlesticks */}
        <CandlestickSeries data={candleData} options={CANDLE_OPTIONS} />

        {/* Conversion Line (Tenkan-sen) — blue */}
        <LineSeries
          data={conversionData}
          options={{
            color: '#2962FF',
            lineWidth: 1,
            lastValueVisible: false,
            priceLineVisible: false,
          }}
        />

        {/* Base Line (Kijun-sen) — dark red */}
        <LineSeries
          data={baseData}
          options={{
            color: '#B71C1C',
            lineWidth: 1,
            lastValueVisible: false,
            priceLineVisible: false,
          }}
        />

        {/* Lagging Span (Chikou Span) — green */}
        <LineSeries
          data={laggingData}
          options={{
            color: '#43A047',
            lineWidth: 1,
            lastValueVisible: false,
            priceLineVisible: false,
          }}
        />

        {/* Leading Span A (Senkou Span A) — light green */}
        <LineSeries
          data={spanAData}
          options={{
            color: '#A5D6A7',
            lineWidth: 1,
            lastValueVisible: false,
            priceLineVisible: false,
          }}
        />

        {/* Leading Span B (Senkou Span B) — light red */}
        <LineSeries
          data={spanBData}
          options={{
            color: '#EF9A9A',
            lineWidth: 1,
            lastValueVisible: false,
            priceLineVisible: false,
          }}
        />

        {/* Cloud fills — rendered as PlotFillPrimitive on invisible anchor series */}
        {bullishBars.length > 0 && (
          <CloudFill bars={bullishBars} color={bullishColor} />
        )}
        {bearishBars.length > 0 && (
          <CloudFill bars={bearishBars} color={bearishColor} />
        )}

        <TimeScale options={{ borderColor: '#2b2b43', timeVisible: true, secondsVisible: false }}>
          <TimeScaleFitContentTrigger deps={[candleData]} />
        </TimeScale>
      </Chart>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function filterValid(
  data: Array<{ time: number; value: number }> | undefined,
): LineData<Time>[] {
  if (!data) return [];
  return data.filter(d => d.value != null && !Number.isNaN(d.value)) as LineData<Time>[];
}
