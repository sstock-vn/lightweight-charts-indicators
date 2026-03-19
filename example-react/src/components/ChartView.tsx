/**
 * Declarative chart using lightweight-charts-react-components.
 * Renders indicator display state as a React component tree.
 */

import { useRef, useEffect, useMemo } from 'react';
import {
  Chart,
  Pane,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  AreaSeries,
  BaselineSeries,
  Markers,
  SeriesPrimitive,
  TimeScale,
  TimeScaleFitContentTrigger,
} from 'lightweight-charts-react-components';
import type { Time, CandlestickData, LineData, SeriesMarker } from 'lightweight-charts';
import { LineStyle, LineType, ColorType } from 'lightweight-charts';
import type { Bar } from 'oakscriptjs';
import type { IndicatorDisplayState, LineBrEntry, CrossPlotEntry, PlotFillEntry } from '../display-state';
import { EMPTY_DISPLAY } from '../display-state';
import {
  LineBrPrimitive,
  CrossPlotPrimitive,
  BgColorPrimitive,
  PlotFillPrimitive,
  ExtendedMarkerPrimitive,
  LabelPrimitive,
  LineDrawingPrimitive,
  BoxPrimitive,
} from '../primitives';
import { toCandlestickData } from '../data-loader';

interface ChartViewProps {
  bars: Bar[];
  display: IndicatorDisplayState;
}

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
  timeScale: { borderColor: '#2b2b43', timeVisible: true, secondsVisible: false },
};

const CANDLE_OPTIONS = {
  upColor: '#26a69a',
  downColor: '#ef5350',
  borderVisible: false,
  wickUpColor: '#26a69a',
  wickDownColor: '#ef5350',
};

const INVISIBLE_LINE_OPTIONS = {
  color: 'transparent',
  lineVisible: false,
  lastValueVisible: false,
  priceLineVisible: false,
  crosshairMarkerVisible: false,
};

const lineStyleMap: Record<number, LineStyle> = {
  0: LineStyle.Solid,
  1: LineStyle.Dashed,
  2: LineStyle.Dotted,
};

function filterValid(data: Array<{ time: number; value: number }>): LineData<Time>[] {
  return data.filter(d => d.value != null && !Number.isNaN(d.value)) as LineData<Time>[];
}

// ─── Primitive wrapper components ────────────────────────────────────────────

function LineBrSeries({ entry }: { entry: LineBrEntry }) {
  const primRef = useRef(new LineBrPrimitive());
  useEffect(() => {
    primRef.current.setData(entry.data, entry.color, entry.lineWidth, entry.lineStyle, entry.withSteps);
  }, [entry]);

  return (
    <LineSeries data={entry.anchorData as LineData<Time>[]} options={INVISIBLE_LINE_OPTIONS}>
      <SeriesPrimitive plugin={primRef.current} />
    </LineSeries>
  );
}

function CrossPlotSeries({ entry }: { entry: CrossPlotEntry }) {
  const primRef = useRef(new CrossPlotPrimitive());
  useEffect(() => {
    primRef.current.setData(entry.data, entry.color, entry.size);
  }, [entry]);

  return (
    <LineSeries data={entry.anchorData as LineData<Time>[]} options={INVISIBLE_LINE_OPTIONS}>
      <SeriesPrimitive plugin={primRef.current} />
    </LineSeries>
  );
}

function PlotFillSeries({ entry }: { entry: PlotFillEntry }) {
  const primRef = useRef(new PlotFillPrimitive());
  useEffect(() => {
    primRef.current.setData(entry.bars, entry.color);
  }, [entry]);

  return (
    <LineSeries data={entry.anchorData as LineData<Time>[]} options={INVISIBLE_LINE_OPTIONS}>
      <SeriesPrimitive plugin={primRef.current} />
    </LineSeries>
  );
}

function BgColorSeries({ data }: { data: import('@lib/types').BgColorData[] }) {
  const primRef = useRef(new BgColorPrimitive());
  useEffect(() => {
    primRef.current.setData(data);
  }, [data]);

  const anchorData = useMemo(() => {
    if (data.length === 0) return [];
    return [
      { time: data[0].time as unknown as Time, value: 0 },
      { time: data[data.length - 1].time as unknown as Time, value: 0 },
    ];
  }, [data]);

  return (
    <LineSeries data={anchorData as LineData<Time>[]} options={INVISIBLE_LINE_OPTIONS}>
      <SeriesPrimitive plugin={primRef.current} />
    </LineSeries>
  );
}

function LabelSeries({ data }: { data: import('@lib/types').LabelData[] }) {
  const primRef = useRef(new LabelPrimitive());
  useEffect(() => {
    primRef.current.setLabels(data);
  }, [data]);

  const anchorData = useMemo(() =>
    data.map(l => ({ time: l.time as unknown as Time, value: l.price })),
    [data]
  );

  return (
    <LineSeries data={anchorData as LineData<Time>[]} options={INVISIBLE_LINE_OPTIONS}>
      <SeriesPrimitive plugin={primRef.current} />
    </LineSeries>
  );
}

function LineDrawingSeries({ data }: { data: import('@lib/types').LineDrawingData[] }) {
  const primRef = useRef(new LineDrawingPrimitive());
  useEffect(() => {
    primRef.current.setLines(data);
  }, [data]);

  const anchorData = useMemo(() => {
    const times = new Set<number>();
    const prices: Record<number, number> = {};
    for (const line of data) {
      times.add(line.time1); times.add(line.time2);
      prices[line.time1] = line.price1; prices[line.time2] = line.price2;
    }
    return Array.from(times).sort((a, b) => a - b).map(t => ({
      time: t as unknown as Time, value: prices[t],
    }));
  }, [data]);

  return (
    <LineSeries data={anchorData as LineData<Time>[]} options={INVISIBLE_LINE_OPTIONS}>
      <SeriesPrimitive plugin={primRef.current} />
    </LineSeries>
  );
}

function BoxSeries({ data }: { data: import('@lib/types').BoxData[] }) {
  const primRef = useRef(new BoxPrimitive());
  useEffect(() => {
    primRef.current.setBoxes(data);
  }, [data]);

  const anchorData = useMemo(() => {
    const times = new Set<number>();
    const prices: Record<number, number> = {};
    for (const box of data) {
      times.add(box.time1); times.add(box.time2);
      prices[box.time1] = box.price1; prices[box.time2] = box.price2;
    }
    return Array.from(times).sort((a, b) => a - b).map(t => ({
      time: t as unknown as Time, value: prices[t],
    }));
  }, [data]);

  return (
    <LineSeries data={anchorData as LineData<Time>[]} options={INVISIBLE_LINE_OPTIONS}>
      <SeriesPrimitive plugin={primRef.current} />
    </LineSeries>
  );
}

function ExtendedMarkerSeries({ markers }: { markers: import('@lib/types').MarkerData[] }) {
  const primRef = useRef(new ExtendedMarkerPrimitive());
  useEffect(() => {
    primRef.current.setMarkers(markers);
  }, [markers]);

  return <SeriesPrimitive plugin={primRef.current} />;
}

// ─── Table overlay ──────────────────────────────────────────────────────────

function TableOverlay({ table }: { table: import('@lib/types').TableData }) {
  const positionStyles: Record<string, React.CSSProperties> = {
    top_left: { top: 8, left: 8 },
    top_center: { top: 8, left: '50%', transform: 'translateX(-50%)' },
    top_right: { top: 8, right: 8 },
    middle_left: { top: '50%', left: 8, transform: 'translateY(-50%)' },
    middle_center: { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' },
    middle_right: { top: '50%', right: 8, transform: 'translateY(-50%)' },
    bottom_left: { bottom: 8, left: 8 },
    bottom_center: { bottom: 8, left: '50%', transform: 'translateX(-50%)' },
    bottom_right: { bottom: 8, right: 8 },
  };

  const fontSizes: Record<string, string> = { tiny: '9px', small: '10px', normal: '11px', large: '13px', huge: '16px' };

  const grid: string[][] = Array.from({ length: table.rows }, () =>
    Array.from({ length: table.columns }, () => '')
  );
  const cellStyles: Record<string, { bgColor?: string; textColor?: string; textSize?: string }> = {};

  for (const cell of table.cells) {
    if (cell.row < table.rows && cell.column < table.columns) {
      grid[cell.row][cell.column] = cell.text;
      cellStyles[`${cell.row}_${cell.column}`] = { bgColor: cell.bgColor, textColor: cell.textColor, textSize: cell.textSize };
    }
  }

  return (
    <div style={{
      position: 'absolute',
      ...positionStyles[table.position] ?? { top: 8, right: 8 },
      zIndex: 10,
      pointerEvents: 'none',
      background: 'rgba(30,34,45,0.9)',
      border: '1px solid #2b2b43',
      borderRadius: 4,
      padding: 4,
      fontFamily: 'monospace',
      fontSize: 11,
      color: '#d1d4dc',
    }}>
      <table style={{ borderCollapse: 'collapse' }}>
        <tbody>
          {grid.map((row, r) => (
            <tr key={r}>
              {row.map((text, c) => {
                const s = cellStyles[`${r}_${c}`] ?? {};
                return (
                  <td key={c} style={{
                    padding: '2px 6px',
                    background: s.bgColor,
                    color: s.textColor,
                    fontSize: s.textSize ? fontSizes[s.textSize] : undefined,
                  }}>
                    {text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Shared series rendering helpers ────────────────────────────────────────

function renderSeriesGroup(
  lines: IndicatorDisplayState['overlayLines'],
  histograms: IndicatorDisplayState['overlayHistograms'],
  areas: IndicatorDisplayState['overlayAreas'],
  lineBrs: IndicatorDisplayState['overlayLineBrs'],
  crossPlots: IndicatorDisplayState['overlayCrossPlots'],
  hlines: IndicatorDisplayState['overlayHLines'],
  fills: IndicatorDisplayState['overlayFills'],
  plotFills: IndicatorDisplayState['overlayPlotFills'],
  candlePlots: IndicatorDisplayState['overlayCandlePlots'],
  firstTime: Time | null,
  lastTime: Time | null,
) {
  return (
    <>
      {lines.map(s => (
        <LineSeries
          key={s.id}
          data={filterValid(s.data)}
          options={{
            color: s.color || '#2962FF',
            lineWidth: (s.lineWidth >= 1 && s.lineWidth <= 4 ? s.lineWidth : 2) as 1 | 2 | 3 | 4,
            lineStyle: lineStyleMap[s.lineStyle ?? 0] ?? LineStyle.Solid,
            lineType: s.lineType === 1 ? LineType.WithSteps : LineType.Simple,
            pointMarkersVisible: s.pointMarkersVisible ?? false,
            lineVisible: s.lineVisible ?? true,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 4,
          }}
        />
      ))}

      {histograms.map(s => (
        <HistogramSeries
          key={s.id}
          data={filterValid(s.data) as any}
          options={{
            color: s.color || '#26A69A',
            lastValueVisible: false,
            priceLineVisible: false,
          }}
        />
      ))}

      {areas.map(s => {
        const color = s.color || '#2962FF';
        return (
          <AreaSeries
            key={s.id}
            data={filterValid(s.data) as any}
            options={{
              topColor: color + '40',
              bottomColor: color + '10',
              lineColor: color,
              lineWidth: (s.lineWidth >= 1 && s.lineWidth <= 4 ? s.lineWidth : 2) as 1 | 2 | 3 | 4,
              crosshairMarkerVisible: true,
            }}
          />
        );
      })}

      {lineBrs.map(entry => <LineBrSeries key={entry.id} entry={entry} />)}
      {crossPlots.map(entry => <CrossPlotSeries key={entry.id} entry={entry} />)}
      {plotFills.map(entry => <PlotFillSeries key={entry.id} entry={entry} />)}

      {candlePlots.map(s => (
        <CandlestickSeries
          key={s.id}
          data={s.data as CandlestickData<Time>[]}
          options={{
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: true,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
          }}
        />
      ))}

      {hlines.map(h => (
        <LineSeries
          key={h.id}
          data={firstTime && lastTime ? [
            { time: firstTime, value: h.data[0]?.value ?? 0 },
            { time: lastTime, value: h.data[0]?.value ?? 0 },
          ] as LineData<Time>[] : []}
          options={{
            color: h.color || '#787B86',
            lineWidth: (h.lineWidth >= 1 && h.lineWidth <= 4 ? h.lineWidth : 1) as 1 | 2 | 3 | 4,
            lineStyle: lineStyleMap[h.lineStyle] ?? LineStyle.Solid,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
          }}
        />
      ))}

      {fills.map(f => (
        <BaselineSeries
          key={f.id}
          data={firstTime && lastTime ? [
            { time: firstTime, value: f.upperPrice },
            { time: lastTime, value: f.upperPrice },
          ] as any : []}
          options={{
            baseValue: { type: 'price' as const, price: f.lowerPrice },
            topFillColor1: f.color,
            topFillColor2: f.color,
            bottomFillColor1: 'transparent',
            bottomFillColor2: 'transparent',
            topLineColor: 'transparent',
            bottomLineColor: 'transparent',
            lineVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          }}
        />
      ))}
    </>
  );
}

// ─── Main ChartView ─────────────────────────────────────────────────────────

export default function ChartView({ bars, display = EMPTY_DISPLAY }: ChartViewProps) {
  const candlestickData = useMemo(() => {
    const data = toCandlestickData(bars) as CandlestickData<Time>[];
    if (display.barColors.length > 0) {
      const colorMap = new Map(display.barColors.map(bc => [bc.time, bc.color]));
      return data.map(bar => {
        const color = colorMap.get(bar.time as unknown as number);
        if (color) return { ...bar, color, borderColor: color, wickColor: color };
        return bar;
      });
    }
    return data;
  }, [bars, display.barColors]);

  const firstTime = bars.length > 0 ? (bars[0].time as unknown as Time) : null;
  const lastTime = bars.length > 0 ? (bars[bars.length - 1].time as unknown as Time) : null;

  const hasMarkers = display.builtinMarkers.length > 0 || display.extendedMarkers.length > 0;

  return (
    <div id="chart-container" style={{ position: 'relative' }}>
      <Chart
        options={CHART_OPTIONS}
        containerProps={{ style: { width: '100%', height: '100%' } }}
      >
        {/* Main pane (pane 0) */}
        <CandlestickSeries data={candlestickData} options={CANDLE_OPTIONS}>
          {display.builtinMarkers.length > 0 && (
            <Markers markers={display.builtinMarkers as SeriesMarker<Time>[]} />
          )}
          {display.extendedMarkers.length > 0 && (
            <ExtendedMarkerSeries markers={display.extendedMarkers} />
          )}
        </CandlestickSeries>

        {/* Overlay series on main pane */}
        {renderSeriesGroup(
          display.overlayLines, display.overlayHistograms, display.overlayAreas,
          display.overlayLineBrs, display.overlayCrossPlots,
          display.overlayHLines, display.overlayFills, display.overlayPlotFills,
          display.overlayCandlePlots, firstTime, lastTime,
        )}

        {/* BgColors / Labels / LineDrawings / Boxes on main pane if overlay */}
        {display.bgColors && display.bgColorsPaneIndex === 0 && (
          <BgColorSeries data={display.bgColors} />
        )}
        {display.labels && display.labelsPaneIndex === 0 && (
          <LabelSeries data={display.labels} />
        )}
        {display.lineDrawings && display.lineDrawingsPaneIndex === 0 && (
          <LineDrawingSeries data={display.lineDrawings} />
        )}
        {display.boxes && display.boxesPaneIndex === 0 && (
          <BoxSeries data={display.boxes} />
        )}

        {/* Indicator pane (pane 1) */}
        {display.hasIndicatorPane && (
          <Pane>
            {renderSeriesGroup(
              display.indicatorLines, display.indicatorHistograms, display.indicatorAreas,
              display.indicatorLineBrs, display.indicatorCrossPlots,
              display.indicatorHLines, display.indicatorFills, display.indicatorPlotFills,
              display.indicatorCandlePlots, firstTime, lastTime,
            )}

            {display.bgColors && display.bgColorsPaneIndex === 1 && (
              <BgColorSeries data={display.bgColors} />
            )}
            {display.labels && display.labelsPaneIndex === 1 && (
              <LabelSeries data={display.labels} />
            )}
            {display.lineDrawings && display.lineDrawingsPaneIndex === 1 && (
              <LineDrawingSeries data={display.lineDrawings} />
            )}
            {display.boxes && display.boxesPaneIndex === 1 && (
              <BoxSeries data={display.boxes} />
            )}
          </Pane>
        )}

        <TimeScale options={{ borderColor: '#2b2b43', timeVisible: true, secondsVisible: false }}>
          <TimeScaleFitContentTrigger deps={[candlestickData]} />
        </TimeScale>
      </Chart>

      {/* Table overlay */}
      {display.table && <TableOverlay table={display.table} />}
    </div>
  );
}
