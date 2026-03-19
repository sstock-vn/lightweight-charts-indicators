/**
 * Indicator panel that computes display state declaratively.
 * Instead of imperatively calling ChartManager, it returns an IndicatorDisplayState.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Bar } from 'oakscriptjs';
import type { SeriesMarker, Time } from 'lightweight-charts';
import { LineType } from 'lightweight-charts';
import { indicatorRegistry } from '@lib/index';
import type { IndicatorRegistryEntry, IndicatorCategory, MarkerData } from '@lib/index';
import type { IndicatorDisplayState } from '../display-state';
import { EMPTY_DISPLAY } from '../display-state';
import type {
  LineSeriesEntry, HistogramSeriesEntry, AreaSeriesEntry,
  LineBrEntry, CrossPlotEntry, HLineEntry, FillEntry, PlotFillEntry,
  CandlePlotEntry,
} from '../display-state';
import type { PlotFillBar } from '../primitives';
import IndicatorInputs from './IndicatorInputs';

const BUILTIN_MARKER_SHAPES = new Set(['arrowUp', 'arrowDown', 'circle', 'square']);

type IndicatorGroup = 'standard' | 'candlestick' | 'community';

const groupOrder: { key: IndicatorGroup; label: string }[] = [
  { key: 'standard', label: 'Standard' },
  { key: 'candlestick', label: 'Candlestick Patterns' },
  { key: 'community', label: 'Community' },
];

const categoryOrder: IndicatorCategory[] = [
  'Moving Averages', 'Momentum', 'Oscillators', 'Trend',
  'Volatility', 'Volume', 'Channels & Bands', 'Candlestick Patterns',
];

function groupIndicators(indicators: IndicatorRegistryEntry[]): Map<IndicatorGroup, Map<IndicatorCategory, IndicatorRegistryEntry[]>> {
  const result = new Map<IndicatorGroup, Map<IndicatorCategory, IndicatorRegistryEntry[]>>();
  for (const { key } of groupOrder) {
    const categoryMap = new Map<IndicatorCategory, IndicatorRegistryEntry[]>();
    for (const cat of categoryOrder) categoryMap.set(cat, []);
    result.set(key, categoryMap);
  }
  for (const ind of indicators) {
    const categoryMap = result.get(ind.group as IndicatorGroup);
    if (categoryMap) {
      const arr = categoryMap.get(ind.category);
      if (arr) arr.push(ind);
    }
  }
  for (const [, categoryMap] of result) {
    for (const [, arr] of categoryMap) {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    }
  }
  return result;
}

interface IndicatorPanelProps {
  bars: Bar[];
  onDisplayChange: (display: IndicatorDisplayState) => void;
}

const lineStyleMap: Record<string, number> = { solid: 0, dashed: 1, dotted: 2 };

export default function IndicatorPanelDeclarative({ bars, onDisplayChange }: IndicatorPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, unknown>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(groupOrder.map(g => g.key)));
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set(categoryOrder));
  const inputsRef = useRef<HTMLDivElement>(null);

  const grouped = useMemo(() => groupIndicators(indicatorRegistry), []);

  const handleSelectIndicator = useCallback((id: string) => {
    if (selectedId === id) {
      setSelectedId(null);
      setInputs({});
      return;
    }
    const indicator = indicatorRegistry.find(ind => ind.id === id);
    if (!indicator) return;
    setSelectedId(id);
    setInputs({ ...indicator.defaultInputs });
    setCollapsedGroups(new Set(groupOrder.map(g => g.key)));
    setTimeout(() => {
      inputsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [selectedId]);

  const handleInputChange = useCallback((inputId: string, value: unknown) => {
    setInputs(prev => ({ ...prev, [inputId]: value }));
  }, []);

  // Compute display state from indicator result
  useEffect(() => {
    if (!selectedId || bars.length === 0) {
      onDisplayChange(EMPTY_DISPLAY);
      return;
    }

    const indicator = indicatorRegistry.find(ind => ind.id === selectedId);
    if (!indicator) {
      onDisplayChange(EMPTY_DISPLAY);
      return;
    }

    try {
      const result = indicator.calculate(bars, inputs);
      const isOverlay = indicator.overlay;
      const paneIndex = isOverlay ? 0 : 1;

      const overlayLines: LineSeriesEntry[] = [];
      const overlayHistograms: HistogramSeriesEntry[] = [];
      const overlayAreas: AreaSeriesEntry[] = [];
      const overlayLineBrs: LineBrEntry[] = [];
      const overlayCrossPlots: CrossPlotEntry[] = [];
      const indicatorLines: LineSeriesEntry[] = [];
      const indicatorHistograms: HistogramSeriesEntry[] = [];
      const indicatorAreas: AreaSeriesEntry[] = [];
      const indicatorLineBrs: LineBrEntry[] = [];
      const indicatorCrossPlots: CrossPlotEntry[] = [];

      for (const plotDef of indicator.plotConfig) {
        const plotData = result.plots[plotDef.id];
        const isVisible = evaluatePlotVisibility(plotDef as unknown as Record<string, unknown>, result, inputs);
        if (!plotData || plotData.length === 0 || !isVisible) continue;

        const style = plotDef.style ?? 'line';
        const color = plotDef.color || '#2962FF';
        const lineWidth = plotDef.lineWidth ?? 2;

        const target = isOverlay ? 'overlay' : 'indicator';
        const lines = target === 'overlay' ? overlayLines : indicatorLines;
        const histograms = target === 'overlay' ? overlayHistograms : indicatorHistograms;
        const areas = target === 'overlay' ? overlayAreas : indicatorAreas;
        const lineBrs = target === 'overlay' ? overlayLineBrs : indicatorLineBrs;
        const crossPlots = target === 'overlay' ? overlayCrossPlots : indicatorCrossPlots;

        const anchorData = plotData.filter((d: any) => d.value != null && !Number.isNaN(d.value));

        switch (style) {
          case 'histogram':
          case 'columns':
            histograms.push({ id: plotDef.id, data: plotData, color });
            break;
          case 'circles':
            lines.push({ id: plotDef.id, data: plotData, color, lineWidth, pointMarkersVisible: true, lineVisible: false });
            break;
          case 'cross':
            crossPlots.push({ id: plotDef.id, data: plotData, anchorData, color, size: lineWidth * 3 });
            break;
          case 'stepline':
            lines.push({ id: plotDef.id, data: plotData, color, lineWidth, lineType: LineType.WithSteps });
            break;
          case 'steplinebr':
            lineBrs.push({ id: plotDef.id, data: plotData, anchorData, color, lineWidth, lineStyle: 0, withSteps: true });
            break;
          case 'area':
            areas.push({ id: plotDef.id, data: plotData, color, lineWidth });
            break;
          case 'linebr':
            lineBrs.push({ id: plotDef.id, data: plotData, anchorData, color, lineWidth, lineStyle: 0, withSteps: false });
            break;
          case 'line':
          default:
            lines.push({ id: plotDef.id, data: plotData, color, lineWidth });
            break;
        }
      }

      // HLines
      const overlayHLines: HLineEntry[] = [];
      const indicatorHLines: HLineEntry[] = [];
      if (indicator.hlineConfig?.length) {
        const firstTime = bars[0].time;
        const lastTime = bars[bars.length - 1].time;
        for (const hline of indicator.hlineConfig) {
          const entry: HLineEntry = {
            id: hline.id,
            data: [{ time: firstTime, value: hline.price }, { time: lastTime, value: hline.price }],
            color: hline.color ?? '#787B86',
            lineWidth: hline.linewidth ?? 1,
            lineStyle: lineStyleMap[hline.linestyle ?? 'solid'] ?? 0,
          };
          if (isOverlay) overlayHLines.push(entry);
          else indicatorHLines.push(entry);
        }
      }

      // Fills between hlines
      const overlayFills: FillEntry[] = [];
      const indicatorFills: FillEntry[] = [];
      if (indicator.fillConfig?.length && indicator.hlineConfig) {
        const hlineMap = new Map(indicator.hlineConfig.map(h => [h.id, h.price]));
        const firstTime = bars[0].time;
        const lastTime = bars[bars.length - 1].time;
        for (const fill of indicator.fillConfig) {
          const price1 = hlineMap.get(fill.plot1);
          const price2 = hlineMap.get(fill.plot2);
          if (price1 == null || price2 == null) continue;
          const entry: FillEntry = {
            id: fill.id,
            upperPrice: Math.max(price1, price2),
            lowerPrice: Math.min(price1, price2),
            color: fill.color ?? 'rgba(41,98,255,0.1)',
            data: [{ time: firstTime, value: Math.max(price1, price2) }, { time: lastTime, value: Math.max(price1, price2) }],
          };
          if (isOverlay) overlayFills.push(entry);
          else indicatorFills.push(entry);
        }
      }

      // Plot fills
      const overlayPlotFills: PlotFillEntry[] = [];
      const indicatorPlotFills: PlotFillEntry[] = [];
      if (result.fills?.length) {
        for (const fill of result.fills) {
          const p1Data = result.plots[fill.plot1];
          const p2Data = result.plots[fill.plot2];
          if (!p1Data?.length || !p2Data?.length) continue;

          let fillColor: string;
          if (fill.options?.color) {
            const transp = fill.options.transp;
            if (transp != null) {
              const alpha = Math.round((1 - transp / 100) * 255);
              fillColor = fill.options.color + alpha.toString(16).padStart(2, '0');
            } else {
              fillColor = fill.options.color + '40';
            }
          } else {
            fillColor = '#2962FF40';
          }

          const p2Map = new Map<number, number>(p2Data.map((d: any) => [d.time, d.value]));
          const fillBars: PlotFillBar[] = [];
          for (const d1 of p1Data as Array<{ time: number; value: number }>) {
            const v1: number = d1.value;
            const v2 = p2Map.get(d1.time);
            if (v1 == null || v2 == null || Number.isNaN(v1) || Number.isNaN(v2)) continue;
            fillBars.push({ time: d1.time, upper: Math.max(v1, v2), lower: Math.min(v1, v2) });
          }
          if (!fillBars.length) continue;

          const entry: PlotFillEntry = {
            id: `plotfill_${fill.plot1}_${fill.plot2}`,
            bars: fillBars,
            anchorData: fillBars.map(b => ({ time: b.time, value: b.upper })),
            color: fillColor,
          };
          if (isOverlay) overlayPlotFills.push(entry);
          else indicatorPlotFills.push(entry);
        }
      }

      // Markers
      const builtinMarkers: SeriesMarker<Time>[] = [];
      const extendedMarkers: MarkerData[] = [];
      if (Array.isArray(result.markers) && result.markers.length > 0) {
        for (const m of result.markers as MarkerData[]) {
          if (BUILTIN_MARKER_SHAPES.has(m.shape)) {
            builtinMarkers.push({
              time: m.time as unknown as Time,
              position: m.position,
              shape: m.shape as 'arrowUp' | 'arrowDown' | 'circle' | 'square',
              color: m.color,
              text: m.text ?? '',
              size: m.size,
            });
          } else {
            extendedMarkers.push(m);
          }
        }
      }

      // Candle plots
      const overlayCandlePlots: CandlePlotEntry[] = [];
      const indicatorCandlePlots: CandlePlotEntry[] = [];
      if (result.plotCandles) {
        for (const [id, data] of Object.entries(result.plotCandles)) {
          if (Array.isArray(data) && data.length > 0) {
            const entry: CandlePlotEntry = { id, data: data as any };
            if (isOverlay) overlayCandlePlots.push(entry);
            else indicatorCandlePlots.push(entry);
          }
        }
      }

      const display: IndicatorDisplayState = {
        overlayLines, overlayHistograms, overlayAreas, overlayLineBrs, overlayCrossPlots,
        overlayHLines, overlayFills, overlayPlotFills, overlayCandlePlots,
        indicatorLines, indicatorHistograms, indicatorAreas, indicatorLineBrs, indicatorCrossPlots,
        indicatorHLines, indicatorFills, indicatorPlotFills, indicatorCandlePlots,
        builtinMarkers, extendedMarkers,
        barColors: Array.isArray(result.barColors) ? result.barColors : [],
        bgColors: Array.isArray(result.bgColors) && result.bgColors.length > 0 ? result.bgColors : null,
        bgColorsPaneIndex: paneIndex,
        labels: Array.isArray(result.labels) && result.labels.length > 0 ? result.labels : null,
        labelsPaneIndex: paneIndex,
        lineDrawings: Array.isArray(result.lines) && result.lines.length > 0 ? result.lines : null,
        lineDrawingsPaneIndex: paneIndex,
        boxes: Array.isArray(result.boxes) && result.boxes.length > 0 ? result.boxes : null,
        boxesPaneIndex: paneIndex,
        table: Array.isArray(result.tables) && result.tables.length > 0
          ? result.tables[0]
          : (result.tables && !Array.isArray(result.tables) ? result.tables : null),
        hasIndicatorPane: !isOverlay,
      };

      onDisplayChange(display);
    } catch (error) {
      console.error('Error calculating indicator:', error);
      onDisplayChange(EMPTY_DISPLAY);
    }
  }, [selectedId, inputs, bars, onDisplayChange]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const query = searchQuery.toLowerCase().trim();

  const selectedIndicator = selectedId
    ? indicatorRegistry.find(ind => ind.id === selectedId) ?? null
    : null;

  return (
    <div className="indicator-panel-container">
      <div className="indicator-panel">
        <h3>Indicators</h3>
        <input
          type="text"
          className="indicator-search"
          placeholder="Search indicators..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div id="indicator-list">
          {groupOrder.map(({ key, label }) => {
            const categoryMap = grouped.get(key)!;
            let totalCount = 0;
            for (const [, arr] of categoryMap) totalCount += arr.length;
            if (totalCount === 0) return null;

            const categoryEntries = Array.from(categoryMap.entries()).filter(([, arr]) => arr.length > 0);
            const groupMatchCount = query
              ? categoryEntries.reduce((sum, [, arr]) =>
                  sum + arr.filter(ind =>
                    ind.name.toLowerCase().includes(query) ||
                    (ind.shortName || ind.id).toLowerCase().includes(query)
                  ).length, 0)
              : totalCount;

            if (query && groupMatchCount === 0) return null;

            return (
              <div key={key} className="group-section">
                <div
                  className={`group-header${collapsedGroups.has(key) && !query ? ' collapsed' : ''}`}
                  onClick={() => toggleGroup(key)}
                >
                  {label} <span className="group-count">{totalCount}</span>
                </div>
                <div className={`group-items${collapsedGroups.has(key) && !query ? ' collapsed' : ''}`}>
                  {categoryEntries.map(([category, arr]) => {
                    const matchCount = query
                      ? arr.filter(ind =>
                          ind.name.toLowerCase().includes(query) ||
                          (ind.shortName || ind.id).toLowerCase().includes(query)
                        ).length
                      : arr.length;
                    if (query && matchCount === 0) return null;

                    return (
                      <div key={category} className="category-group">
                        <div
                          className={`category-header${collapsedCategories.has(category) && !query ? ' collapsed' : ''}`}
                          onClick={() => toggleCategory(category)}
                        >
                          {category} <span className="category-count">{arr.length}</span>
                        </div>
                        <div className={`category-items${collapsedCategories.has(category) && !query ? ' collapsed' : ''}`}>
                          {arr.map(ind => {
                            const matches = !query ||
                              ind.name.toLowerCase().includes(query) ||
                              (ind.shortName || ind.id).toLowerCase().includes(query);
                            if (!matches) return null;
                            return (
                              <div
                                key={ind.id}
                                className={`indicator-item${selectedId === ind.id ? ' active' : ''}`}
                                onClick={() => handleSelectIndicator(ind.id)}
                              >
                                {ind.name}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div ref={inputsRef}>
          {selectedIndicator && (
            <IndicatorInputs
              indicator={selectedIndicator}
              inputs={inputs}
              onInputChange={handleInputChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function evaluatePlotVisibility(
  plotDef: Record<string, unknown>,
  result: Record<string, unknown>,
  currentInputs: Record<string, unknown>
): boolean {
  if (plotDef.display === 'none') return false;
  if (plotDef.visible === undefined) return true;
  if (typeof plotDef.visible === 'boolean') return plotDef.visible;
  if (typeof plotDef.visible === 'string') {
    const visibleVar = plotDef.visible;
    if (currentInputs[visibleVar] !== undefined) return Boolean(currentInputs[visibleVar]);
    const visibility = result.visibility as Record<string, unknown> | undefined;
    if (visibility && visibility[visibleVar] !== undefined) return Boolean(visibility[visibleVar]);
    const plots = result.plots as Record<string, Array<{ value?: number }>> | undefined;
    const plotData = plots?.[plotDef.id as string];
    if (plotData && Array.isArray(plotData)) {
      return plotData.some(p => p.value !== undefined && p.value !== null && !Number.isNaN(p.value));
    }
  }
  return true;
}
