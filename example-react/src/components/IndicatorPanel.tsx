import { useState, useEffect, useCallback, useRef } from 'react';
import type { Bar } from 'oakscriptjs';
import type { SeriesMarker, Time } from 'lightweight-charts';
import { LineType } from 'lightweight-charts';
import type { ChartManager } from '../chart';
import { indicatorRegistry } from '@lib/index';
import type { IndicatorRegistryEntry, IndicatorCategory, MarkerData } from '@lib/index';
import IndicatorInputs from './IndicatorInputs';

const BUILTIN_MARKER_SHAPES = new Set(['arrowUp', 'arrowDown', 'circle', 'square']);

type IndicatorGroup = 'standard' | 'candlestick' | 'community';

const groupOrder: { key: IndicatorGroup; label: string }[] = [
  { key: 'standard', label: 'Standard' },
  { key: 'candlestick', label: 'Candlestick Patterns' },
  { key: 'community', label: 'Community' },
];

const categoryOrder: IndicatorCategory[] = [
  'Moving Averages',
  'Momentum',
  'Oscillators',
  'Trend',
  'Volatility',
  'Volume',
  'Channels & Bands',
  'Candlestick Patterns',
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
  chartManager: ChartManager | null;
}

export default function IndicatorPanel({ bars, chartManager }: IndicatorPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, unknown>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(groupOrder.map(g => g.key)));
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set(categoryOrder));
  const inputsRef = useRef<HTMLDivElement>(null);

  const grouped = groupIndicators(indicatorRegistry);

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

    // Collapse all groups
    setCollapsedGroups(new Set(groupOrder.map(g => g.key)));

    // Scroll inputs into view
    setTimeout(() => {
      inputsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [selectedId]);

  const handleInputChange = useCallback((inputId: string, value: unknown) => {
    setInputs(prev => ({ ...prev, [inputId]: value }));
  }, []);

  // Recalculate indicator when selection or inputs change
  useEffect(() => {
    if (!chartManager) return;

    if (!selectedId || bars.length === 0) {
      chartManager.clearIndicators();
      return;
    }

    const indicator = indicatorRegistry.find(ind => ind.id === selectedId);
    if (!indicator) return;

    try {
      const result = indicator.calculate(bars, inputs);
      chartManager.clearIndicators();

      const indicatorPaneIndex = indicator.overlay ? 0 : 1;

      // Route plots based on style
      for (const plotDef of indicator.plotConfig) {
        const plotData = result.plots[plotDef.id];
        const isVisible = evaluatePlotVisibility(plotDef as unknown as Record<string, unknown>, result, inputs);

        if (plotData && plotData.length > 0 && isVisible) {
          const seriesConfig = {
            color: plotDef.color,
            lineWidth: plotDef.lineWidth,
            overlay: indicator.overlay,
            paneIndex: indicatorPaneIndex,
          };

          const style = plotDef.style ?? 'line';

          switch (style) {
            case 'histogram':
            case 'columns':
              chartManager.setHistogramData(plotDef.id, plotData, seriesConfig);
              break;
            case 'circles':
              chartManager.setIndicatorData(plotDef.id, plotData, {
                ...seriesConfig,
                pointMarkersVisible: true,
                lineVisible: false,
              });
              break;
            case 'cross':
              chartManager.setCrossPlotData(plotDef.id, plotData, seriesConfig);
              break;
            case 'stepline':
              chartManager.setIndicatorData(plotDef.id, plotData, {
                ...seriesConfig,
                lineType: LineType.WithSteps,
              });
              break;
            case 'steplinebr':
              chartManager.setLineBrData(plotDef.id, plotData, {
                ...seriesConfig,
                lineType: LineType.WithSteps,
              });
              break;
            case 'area':
              chartManager.setAreaPlotData(plotDef.id, plotData, seriesConfig);
              break;
            case 'linebr':
              chartManager.setLineBrData(plotDef.id, plotData, seriesConfig);
              break;
            case 'line':
            default:
              chartManager.setIndicatorData(plotDef.id, plotData, seriesConfig);
              break;
          }
        }
      }

      // Render hlines
      if (indicator.hlineConfig && indicator.hlineConfig.length > 0) {
        chartManager.setHLines(indicator.hlineConfig, indicatorPaneIndex, bars);
      }

      // Render fills between hlines
      if (indicator.fillConfig?.length && indicator.hlineConfig) {
        chartManager.setFills(indicator.fillConfig, indicator.hlineConfig, indicatorPaneIndex, bars);
      }

      // Render plot-to-plot fills
      if (result.fills?.length) {
        chartManager.setPlotFills(result.fills, result.plots, indicatorPaneIndex);
      }

      // Route markers
      if (Array.isArray(result.markers) && result.markers.length > 0) {
        const builtinMarkers: SeriesMarker<Time>[] = [];
        const extendedMarkers: MarkerData[] = [];

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

        chartManager.setMarkers(builtinMarkers, extendedMarkers);
      } else {
        chartManager.clearMarkers();
      }

      // barcolor
      if (Array.isArray(result.barColors) && result.barColors.length > 0) {
        chartManager.setBarColors(result.barColors);
      }

      // bgcolor
      if (Array.isArray(result.bgColors) && result.bgColors.length > 0) {
        chartManager.setBgColors(result.bgColors, indicatorPaneIndex);
      }

      // plotcandle
      if (result.plotCandles) {
        for (const [id, data] of Object.entries(result.plotCandles)) {
          if (Array.isArray(data) && data.length > 0) {
            chartManager.setCandlePlotData(id, data as Parameters<typeof chartManager.setCandlePlotData>[1], indicatorPaneIndex);
          }
        }
      }

      // labels
      if (Array.isArray(result.labels) && result.labels.length > 0) {
        chartManager.setLabels(result.labels, indicatorPaneIndex);
      }

      // line drawings
      if (Array.isArray(result.lines) && result.lines.length > 0) {
        chartManager.setLineDrawings(result.lines, indicatorPaneIndex);
      }

      // boxes
      if (Array.isArray(result.boxes) && result.boxes.length > 0) {
        chartManager.setBoxes(result.boxes, indicatorPaneIndex);
      }

      // tables
      if (Array.isArray(result.tables) && result.tables.length > 0) {
        chartManager.setTable(result.tables[0]);
      } else if (result.tables && !Array.isArray(result.tables)) {
        chartManager.setTable(result.tables);
      }
    } catch (error) {
      console.error('Error calculating indicator:', error);
    }
  }, [selectedId, inputs, bars, chartManager]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
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

            // Pre-compute how many items match the search in this group
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
                          className={`category-header${
                            collapsedCategories.has(category) && !query ? ' collapsed' : ''
                          }`}
                          onClick={() => toggleCategory(category)}
                        >
                          {category} <span className="category-count">{arr.length}</span>
                        </div>
                        <div
                          className={`category-items${
                            collapsedCategories.has(category) && !query ? ' collapsed' : ''
                          }`}
                        >
                          {arr.map(ind => {
                            const matches = !query ||
                              ind.name.toLowerCase().includes(query) ||
                              (ind.shortName || ind.id).toLowerCase().includes(query);

                            if (!matches) return null;

                            return (
                              <div
                                key={ind.id}
                                className={`indicator-item${
                                  selectedId === ind.id ? ' active' : ''
                                }`}
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

    if (currentInputs[visibleVar] !== undefined) {
      return Boolean(currentInputs[visibleVar]);
    }

    const visibility = result.visibility as Record<string, unknown> | undefined;
    if (visibility && visibility[visibleVar] !== undefined) {
      return Boolean(visibility[visibleVar]);
    }

    const plots = result.plots as Record<string, Array<{ value?: number }>> | undefined;
    const plotData = plots?.[plotDef.id as string];
    if (plotData && Array.isArray(plotData)) {
      return plotData.some((p) =>
        p.value !== undefined && p.value !== null && !Number.isNaN(p.value)
      );
    }
  }

  return true;
}
