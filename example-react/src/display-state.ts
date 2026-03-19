/**
 * Declarative display state for the chart.
 * Computed from indicator results and rendered by ChartView.
 */

import type { SeriesMarker, Time } from 'lightweight-charts';
import type {
  BarColorData,
  BgColorData,
  LabelData,
  LineDrawingData,
  BoxData,
  TableData,
  MarkerData,
} from '@lib/types';
import type { PlotFillBar } from './primitives';

export interface LineSeriesEntry {
  id: string;
  data: Array<{ time: number; value: number; color?: string }>;
  color: string;
  lineWidth: number;
  lineStyle?: number;
  lineType?: number;
  pointMarkersVisible?: boolean;
  lineVisible?: boolean;
}

export interface HistogramSeriesEntry {
  id: string;
  data: Array<{ time: number; value: number; color?: string }>;
  color: string;
}

export interface AreaSeriesEntry {
  id: string;
  data: Array<{ time: number; value: number }>;
  color: string;
  lineWidth: number;
}

export interface LineBrEntry {
  id: string;
  data: Array<{ time: number; value: number }>;
  anchorData: Array<{ time: number; value: number }>;
  color: string;
  lineWidth: number;
  lineStyle: number;
  withSteps: boolean;
}

export interface CrossPlotEntry {
  id: string;
  data: Array<{ time: number; value: number }>;
  anchorData: Array<{ time: number; value: number }>;
  color: string;
  size: number;
}

export interface HLineEntry {
  id: string;
  data: Array<{ time: number; value: number }>;
  color: string;
  lineWidth: number;
  lineStyle: number;
}

export interface FillEntry {
  id: string;
  upperPrice: number;
  lowerPrice: number;
  color: string;
  data: Array<{ time: number; value: number }>;
}

export interface PlotFillEntry {
  id: string;
  bars: PlotFillBar[];
  anchorData: Array<{ time: number; value: number }>;
  color: string;
}

export interface CandlePlotEntry {
  id: string;
  data: Array<{ time: number; open: number; high: number; low: number; close: number; color?: string; borderColor?: string; wickColor?: string }>;
}

export interface IndicatorDisplayState {
  // Pane 0 (overlay) series
  overlayLines: LineSeriesEntry[];
  overlayHistograms: HistogramSeriesEntry[];
  overlayAreas: AreaSeriesEntry[];
  overlayLineBrs: LineBrEntry[];
  overlayCrossPlots: CrossPlotEntry[];
  overlayHLines: HLineEntry[];
  overlayFills: FillEntry[];
  overlayPlotFills: PlotFillEntry[];
  overlayCandlePlots: CandlePlotEntry[];

  // Pane 1 (separate indicator pane) series
  indicatorLines: LineSeriesEntry[];
  indicatorHistograms: HistogramSeriesEntry[];
  indicatorAreas: AreaSeriesEntry[];
  indicatorLineBrs: LineBrEntry[];
  indicatorCrossPlots: CrossPlotEntry[];
  indicatorHLines: HLineEntry[];
  indicatorFills: FillEntry[];
  indicatorPlotFills: PlotFillEntry[];
  indicatorCandlePlots: CandlePlotEntry[];

  // Shared
  builtinMarkers: SeriesMarker<Time>[];
  extendedMarkers: MarkerData[];
  barColors: BarColorData[];
  bgColors: BgColorData[] | null;
  bgColorsPaneIndex: number;
  labels: LabelData[] | null;
  labelsPaneIndex: number;
  lineDrawings: LineDrawingData[] | null;
  lineDrawingsPaneIndex: number;
  boxes: BoxData[] | null;
  boxesPaneIndex: number;
  table: TableData | null;

  hasIndicatorPane: boolean;
}

export const EMPTY_DISPLAY: IndicatorDisplayState = {
  overlayLines: [], overlayHistograms: [], overlayAreas: [], overlayLineBrs: [],
  overlayCrossPlots: [], overlayHLines: [], overlayFills: [], overlayPlotFills: [],
  overlayCandlePlots: [],
  indicatorLines: [], indicatorHistograms: [], indicatorAreas: [], indicatorLineBrs: [],
  indicatorCrossPlots: [], indicatorHLines: [], indicatorFills: [], indicatorPlotFills: [],
  indicatorCandlePlots: [],
  builtinMarkers: [], extendedMarkers: [], barColors: [],
  bgColors: null, bgColorsPaneIndex: 0,
  labels: null, labelsPaneIndex: 0,
  lineDrawings: null, lineDrawingsPaneIndex: 0,
  boxes: null, boxesPaneIndex: 0,
  table: null,
  hasIndicatorPane: false,
};
