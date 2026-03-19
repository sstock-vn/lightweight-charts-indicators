/**
 * Custom series primitives for advanced chart rendering.
 * These are reused from the imperative chart.ts but decoupled for the declarative React version.
 */

import type {
  IChartApi,
  ISeriesApi,
  ISeriesPrimitive,
  IPrimitivePaneView,
  IPrimitivePaneRenderer,
  SeriesAttachedParameter,
  Time,
  SeriesType,
} from 'lightweight-charts';
import type { CanvasRenderingTarget2D } from 'fancy-canvas';
import type {
  BgColorData,
  LabelData,
  LineDrawingData,
  BoxData,
  MarkerData,
} from '@lib/types';

// ─── Base ───────────────────────────────────────────────────────────────────

class BasePrimitive implements ISeriesPrimitive<Time> {
  protected _chart: IChartApi | null = null;
  protected _series: ISeriesApi<SeriesType, Time> | null = null;
  protected _requestUpdate: (() => void) | null = null;

  attached(param: SeriesAttachedParameter<Time, SeriesType>): void {
    this._chart = param.chart as IChartApi;
    this._series = param.series as ISeriesApi<SeriesType, Time>;
    this._requestUpdate = param.requestUpdate;
  }

  detached(): void {
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
  }
}

// ─── LineBr ─────────────────────────────────────────────────────────────────

export class LineBrPrimitive extends BasePrimitive {
  private _data: Array<{ time: number; value: number }> = [];
  private _color = '#2962FF';
  private _lineWidth = 2;
  private _lineStyle = 0;
  private _withSteps = false;
  private _views: IPrimitivePaneView[] = [new LineBrPaneView(this)];

  setData(data: Array<{ time: number; value: number }>, color: string, lineWidth = 2, lineStyle = 0, withSteps = false): void {
    this._data = data;
    this._color = color;
    this._lineWidth = lineWidth;
    this._lineStyle = lineStyle;
    this._withSteps = withSteps;
    this._requestUpdate?.();
  }

  getData() { return this._data; }
  getColor() { return this._color; }
  getLineWidth() { return this._lineWidth; }
  getLineStyle() { return this._lineStyle; }
  getWithSteps() { return this._withSteps; }
  getChart() { return this._chart; }
  getSeries() { return this._series; }
  updateAllViews(): void {}
  paneViews(): readonly IPrimitivePaneView[] { return this._views; }
}

class LineBrPaneView implements IPrimitivePaneView {
  constructor(private _source: LineBrPrimitive) {}
  zOrder(): 'normal' { return 'normal'; }
  renderer(): IPrimitivePaneRenderer | null { return new LineBrRenderer(this._source); }
}

class LineBrRenderer implements IPrimitivePaneRenderer {
  constructor(private _source: LineBrPrimitive) {}
  draw(target: CanvasRenderingTarget2D): void {
    const chart = this._source.getChart();
    const series = this._source.getSeries();
    if (!chart || !series) return;
    const data = this._source.getData();
    const color = this._source.getColor();
    const lineWidth = this._source.getLineWidth();
    const lineStyle = this._source.getLineStyle();
    const withSteps = this._source.getWithSteps();
    const timeScale = chart.timeScale();

    target.useMediaCoordinateSpace(({ context: ctx }) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      if (lineStyle === 1) ctx.setLineDash([4, 4]);
      else if (lineStyle === 2) ctx.setLineDash([2, 2]);
      let drawing = false;
      let prevY = 0;
      for (const point of data) {
        if (point.value == null || Number.isNaN(point.value)) {
          if (drawing) { ctx.stroke(); drawing = false; }
          continue;
        }
        const x = timeScale.timeToCoordinate(point.time as unknown as Time);
        const y = series.priceToCoordinate(point.value);
        if (x == null || y == null) { if (drawing) { ctx.stroke(); drawing = false; } continue; }
        if (!drawing) { ctx.beginPath(); ctx.moveTo(x as number, y as number); drawing = true; }
        else { if (withSteps) ctx.lineTo(x as number, prevY); ctx.lineTo(x as number, y as number); }
        prevY = y as number;
      }
      if (drawing) ctx.stroke();
      ctx.setLineDash([]);
    });
  }
}

// ─── CrossPlot ──────────────────────────────────────────────────────────────

export class CrossPlotPrimitive extends BasePrimitive {
  private _data: Array<{ time: number; value: number }> = [];
  private _color = '#2962FF';
  private _size = 6;
  private _views: IPrimitivePaneView[] = [new CrossPlotPaneView(this)];

  setData(data: Array<{ time: number; value: number }>, color: string, size = 6): void {
    this._data = data; this._color = color; this._size = size;
    this._requestUpdate?.();
  }
  getData() { return this._data; }
  getColor() { return this._color; }
  getSize() { return this._size; }
  getChart() { return this._chart; }
  getSeries() { return this._series; }
  updateAllViews(): void {}
  paneViews(): readonly IPrimitivePaneView[] { return this._views; }
}

class CrossPlotPaneView implements IPrimitivePaneView {
  constructor(private _source: CrossPlotPrimitive) {}
  zOrder(): 'normal' { return 'normal'; }
  renderer(): IPrimitivePaneRenderer | null { return new CrossPlotRenderer(this._source); }
}

class CrossPlotRenderer implements IPrimitivePaneRenderer {
  constructor(private _source: CrossPlotPrimitive) {}
  draw(target: CanvasRenderingTarget2D): void {
    const chart = this._source.getChart();
    const series = this._source.getSeries();
    if (!chart || !series) return;
    const data = this._source.getData();
    const color = this._source.getColor();
    const halfSize = this._source.getSize();
    const timeScale = chart.timeScale();
    target.useMediaCoordinateSpace(({ context: ctx }) => {
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      for (const point of data) {
        if (point.value == null || Number.isNaN(point.value)) continue;
        const x = timeScale.timeToCoordinate(point.time as unknown as Time);
        const y = series.priceToCoordinate(point.value);
        if (x == null || y == null) continue;
        ctx.beginPath();
        ctx.moveTo(x - halfSize, y - halfSize); ctx.lineTo(x + halfSize, y + halfSize);
        ctx.moveTo(x + halfSize, y - halfSize); ctx.lineTo(x - halfSize, y + halfSize);
        ctx.stroke();
      }
    });
  }
}

// ─── BgColor ────────────────────────────────────────────────────────────────

export class BgColorPrimitive extends BasePrimitive {
  private _data: BgColorData[] = [];
  private _views: IPrimitivePaneView[] = [new BgColorPaneView(this)];

  setData(data: BgColorData[]): void { this._data = data; this._requestUpdate?.(); }
  getData() { return this._data; }
  getChart() { return this._chart; }
  updateAllViews(): void {}
  paneViews(): readonly IPrimitivePaneView[] { return this._views; }
}

class BgColorPaneView implements IPrimitivePaneView {
  constructor(private _source: BgColorPrimitive) {}
  zOrder(): 'bottom' { return 'bottom'; }
  renderer(): IPrimitivePaneRenderer | null { return new BgColorRenderer(this._source); }
}

class BgColorRenderer implements IPrimitivePaneRenderer {
  constructor(private _source: BgColorPrimitive) {}
  draw(target: CanvasRenderingTarget2D): void {
    const chart = this._source.getChart();
    if (!chart) return;
    const data = this._source.getData();
    const timeScale = chart.timeScale();
    target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
      const visibleRange = timeScale.getVisibleLogicalRange();
      const barsCount = visibleRange ? visibleRange.to - visibleRange.from : 0;
      const barWidth = barsCount > 0 ? Math.max(1, mediaSize.width / barsCount) : 8;
      for (const bar of data) {
        const x = timeScale.timeToCoordinate(bar.time as unknown as Time);
        if (x == null) continue;
        ctx.fillStyle = bar.color;
        ctx.fillRect(x - barWidth / 2, 0, barWidth, mediaSize.height);
      }
    });
  }
}

// ─── PlotFill ───────────────────────────────────────────────────────────────

export interface PlotFillBar { time: number; upper: number; lower: number; }

export class PlotFillPrimitive extends BasePrimitive {
  private _data: PlotFillBar[] = [];
  private _color = '#2962FF40';
  private _views: IPrimitivePaneView[] = [new PlotFillPaneView(this)];

  setData(data: PlotFillBar[], color: string): void { this._data = data; this._color = color; this._requestUpdate?.(); }
  getData() { return this._data; }
  getColor() { return this._color; }
  getChart() { return this._chart; }
  getSeries() { return this._series; }
  updateAllViews(): void {}
  paneViews(): readonly IPrimitivePaneView[] { return this._views; }
}

class PlotFillPaneView implements IPrimitivePaneView {
  constructor(private _source: PlotFillPrimitive) {}
  zOrder(): 'bottom' { return 'bottom'; }
  renderer(): IPrimitivePaneRenderer | null { return new PlotFillRenderer(this._source); }
}

class PlotFillRenderer implements IPrimitivePaneRenderer {
  constructor(private _source: PlotFillPrimitive) {}
  draw(target: CanvasRenderingTarget2D): void {
    const chart = this._source.getChart();
    const series = this._source.getSeries();
    if (!chart || !series) return;
    const data = this._source.getData();
    const color = this._source.getColor();
    const timeScale = chart.timeScale();
    target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
      ctx.fillStyle = color;
      const visibleRange = timeScale.getVisibleLogicalRange();
      const barsCount = visibleRange ? visibleRange.to - visibleRange.from : 0;
      const barWidth = barsCount > 0 ? Math.max(1, mediaSize.width / barsCount) : 8;
      for (const bar of data) {
        const x = timeScale.timeToCoordinate(bar.time as unknown as Time);
        if (x == null) continue;
        const yUpper = series.priceToCoordinate(bar.upper);
        const yLower = series.priceToCoordinate(bar.lower);
        if (yUpper == null || yLower == null) continue;
        const top = Math.min(yUpper as number, yLower as number);
        const bottom = Math.max(yUpper as number, yLower as number);
        ctx.fillRect((x as number) - barWidth / 2, top, barWidth, bottom - top);
      }
    });
  }
}

// ─── ExtendedMarker ─────────────────────────────────────────────────────────

export class ExtendedMarkerPrimitive extends BasePrimitive {
  private _markers: MarkerData[] = [];
  private _views: IPrimitivePaneView[] = [new ExtendedMarkerPaneView(this)];

  setMarkers(markers: MarkerData[]): void { this._markers = markers; this._requestUpdate?.(); }
  getMarkers() { return this._markers; }
  getChart() { return this._chart; }
  getSeries() { return this._series; }
  updateAllViews(): void {}
  paneViews(): readonly IPrimitivePaneView[] { return this._views; }
}

class ExtendedMarkerPaneView implements IPrimitivePaneView {
  constructor(private _source: ExtendedMarkerPrimitive) {}
  zOrder(): 'normal' { return 'normal'; }
  renderer(): IPrimitivePaneRenderer | null { return new ExtendedMarkerRenderer(this._source); }
}

class ExtendedMarkerRenderer implements IPrimitivePaneRenderer {
  constructor(private _source: ExtendedMarkerPrimitive) {}
  draw(target: CanvasRenderingTarget2D): void {
    const chart = this._source.getChart();
    const series = this._source.getSeries();
    if (!chart || !series) return;
    const markers = this._source.getMarkers();
    const timeScale = chart.timeScale();
    target.useMediaCoordinateSpace(({ context: ctx }) => {
      for (const marker of markers) {
        const x = timeScale.timeToCoordinate(marker.time as unknown as Time);
        if (x == null) continue;
        const logical = timeScale.coordinateToLogical(x as number);
        if (logical == null) continue;
        const barData = series.dataByIndex(logical);
        if (!barData) continue;
        const bar = barData as unknown as Record<string, number>;
        let baseY: number | null;
        if (marker.position === 'aboveBar') {
          baseY = series.priceToCoordinate(bar.high ?? bar.value ?? 0);
          if (baseY != null) baseY -= 10;
        } else if (marker.position === 'belowBar') {
          baseY = series.priceToCoordinate(bar.low ?? bar.value ?? 0);
          if (baseY != null) baseY += 10;
        } else {
          baseY = series.priceToCoordinate(bar.close ?? bar.value ?? 0);
        }
        if (baseY == null) continue;
        const size = (marker.size ?? 1) * 6;
        ctx.fillStyle = marker.color;
        ctx.strokeStyle = marker.color;
        ctx.lineWidth = 2;
        drawExtendedShape(ctx, marker.shape, x, baseY, size);
        if (marker.text) {
          ctx.fillStyle = marker.color;
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(marker.text, x, marker.position === 'aboveBar' ? baseY - size - 4 : baseY + size + 12);
        }
      }
    });
  }
}

function drawExtendedShape(ctx: CanvasRenderingContext2D, shape: string, x: number, y: number, size: number): void {
  switch (shape) {
    case 'triangleUp':
      ctx.beginPath(); ctx.moveTo(x, y - size); ctx.lineTo(x - size, y + size); ctx.lineTo(x + size, y + size); ctx.closePath(); ctx.fill(); break;
    case 'triangleDown':
      ctx.beginPath(); ctx.moveTo(x, y + size); ctx.lineTo(x - size, y - size); ctx.lineTo(x + size, y - size); ctx.closePath(); ctx.fill(); break;
    case 'diamond':
      ctx.beginPath(); ctx.moveTo(x, y - size); ctx.lineTo(x + size, y); ctx.lineTo(x, y + size); ctx.lineTo(x - size, y); ctx.closePath(); ctx.fill(); break;
    case 'cross':
      ctx.beginPath(); ctx.moveTo(x - size, y); ctx.lineTo(x + size, y); ctx.moveTo(x, y - size); ctx.lineTo(x, y + size); ctx.stroke(); break;
    case 'xcross':
      ctx.beginPath(); ctx.moveTo(x - size, y - size); ctx.lineTo(x + size, y + size); ctx.moveTo(x + size, y - size); ctx.lineTo(x - size, y + size); ctx.stroke(); break;
    case 'flag':
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - size * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - size * 2); ctx.lineTo(x + size * 1.5, y - size * 1.5); ctx.lineTo(x, y - size); ctx.closePath(); ctx.fill(); break;
    case 'labelUp':
      ctx.beginPath(); ctx.moveTo(x, y - size * 2); ctx.lineTo(x - size, y - size); ctx.lineTo(x + size, y - size); ctx.closePath(); ctx.fill(); break;
    case 'labelDown':
      ctx.beginPath(); ctx.moveTo(x, y + size * 2); ctx.lineTo(x - size, y + size); ctx.lineTo(x + size, y + size); ctx.closePath(); ctx.fill(); break;
  }
}

// ─── Label ──────────────────────────────────────────────────────────────────

const LABEL_FONT_SIZES: Record<string, number> = { tiny: 9, small: 11, normal: 13, large: 16, huge: 20 };

export class LabelPrimitive extends BasePrimitive {
  private _labels: LabelData[] = [];
  private _views: IPrimitivePaneView[] = [new LabelPaneView(this)];

  setLabels(labels: LabelData[]): void { this._labels = labels; this._requestUpdate?.(); }
  getLabels() { return this._labels; }
  getChart() { return this._chart; }
  getSeries() { return this._series; }
  updateAllViews(): void {}
  paneViews(): readonly IPrimitivePaneView[] { return this._views; }
}

class LabelPaneView implements IPrimitivePaneView {
  constructor(private _source: LabelPrimitive) {}
  zOrder(): 'top' { return 'top'; }
  renderer(): IPrimitivePaneRenderer | null { return new LabelRenderer(this._source); }
}

class LabelRenderer implements IPrimitivePaneRenderer {
  constructor(private _source: LabelPrimitive) {}
  draw(target: CanvasRenderingTarget2D): void {
    const chart = this._source.getChart();
    const series = this._source.getSeries();
    if (!chart || !series) return;
    const labels = this._source.getLabels();
    const timeScale = chart.timeScale();
    target.useMediaCoordinateSpace(({ context: ctx }) => {
      for (const label of labels) {
        const x = timeScale.timeToCoordinate(label.time as unknown as Time);
        const y = series.priceToCoordinate(label.price);
        if (x == null || y == null) continue;
        const fontSize = LABEL_FONT_SIZES[label.size ?? 'normal'] ?? 13;
        ctx.font = `${fontSize}px sans-serif`;
        const tw = ctx.measureText(label.text).width;
        const pad = 4;
        if (label.color) {
          ctx.fillStyle = label.color;
          ctx.beginPath(); ctx.roundRect(x - tw / 2 - pad, y - fontSize / 2 - pad, tw + pad * 2, fontSize + pad * 2, 3); ctx.fill();
        }
        ctx.fillStyle = label.textColor ?? '#ffffff';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label.text, x, y);
      }
    });
  }
}

// ─── Line Drawing ───────────────────────────────────────────────────────────

export class LineDrawingPrimitive extends BasePrimitive {
  private _lines: LineDrawingData[] = [];
  private _views: IPrimitivePaneView[] = [new LineDrawingPaneView(this)];

  setLines(lines: LineDrawingData[]): void { this._lines = lines; this._requestUpdate?.(); }
  getLines() { return this._lines; }
  getChart() { return this._chart; }
  getSeries() { return this._series; }
  updateAllViews(): void {}
  paneViews(): readonly IPrimitivePaneView[] { return this._views; }
}

class LineDrawingPaneView implements IPrimitivePaneView {
  constructor(private _source: LineDrawingPrimitive) {}
  zOrder(): 'normal' { return 'normal'; }
  renderer(): IPrimitivePaneRenderer | null { return new LineDrawingRenderer(this._source); }
}

class LineDrawingRenderer implements IPrimitivePaneRenderer {
  constructor(private _source: LineDrawingPrimitive) {}
  draw(target: CanvasRenderingTarget2D): void {
    const chart = this._source.getChart();
    const series = this._source.getSeries();
    if (!chart || !series) return;
    const lines = this._source.getLines();
    const timeScale = chart.timeScale();
    target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
      for (const line of lines) {
        const x1 = timeScale.timeToCoordinate(line.time1 as unknown as Time);
        const y1 = series.priceToCoordinate(line.price1);
        const x2 = timeScale.timeToCoordinate(line.time2 as unknown as Time);
        const y2 = series.priceToCoordinate(line.price2);
        if (x1 == null || y1 == null || x2 == null || y2 == null) continue;
        ctx.strokeStyle = line.color ?? '#2962FF';
        ctx.lineWidth = line.width ?? 1;
        if (line.style === 'dashed') ctx.setLineDash([6, 3]);
        else if (line.style === 'dotted') ctx.setLineDash([2, 2]);
        else ctx.setLineDash([]);
        ctx.beginPath();
        const extend = line.extend ?? 'none';
        let sX: number = x1, sY: number = y1, eX: number = x2, eY: number = y2;
        if (extend === 'left' || extend === 'both') {
          const dx = (x2 as number) - (x1 as number), dy = (y2 as number) - (y1 as number);
          if (dx !== 0) { const t = -(x1 as number) / dx; sX = 0; sY = (y1 as number) + dy * t; }
        }
        if (extend === 'right' || extend === 'both') {
          const dx = (x2 as number) - (x1 as number), dy = (y2 as number) - (y1 as number);
          if (dx !== 0) { const t = (mediaSize.width - (x1 as number)) / dx; eX = mediaSize.width; eY = (y1 as number) + dy * t; }
        }
        ctx.moveTo(sX, sY); ctx.lineTo(eX, eY); ctx.stroke(); ctx.setLineDash([]);
      }
    });
  }
}

// ─── Box ────────────────────────────────────────────────────────────────────

export class BoxPrimitive extends BasePrimitive {
  private _boxes: BoxData[] = [];
  private _views: IPrimitivePaneView[] = [new BoxPaneView(this)];

  setBoxes(boxes: BoxData[]): void { this._boxes = boxes; this._requestUpdate?.(); }
  getBoxes() { return this._boxes; }
  getChart() { return this._chart; }
  getSeries() { return this._series; }
  updateAllViews(): void {}
  paneViews(): readonly IPrimitivePaneView[] { return this._views; }
}

class BoxPaneView implements IPrimitivePaneView {
  constructor(private _source: BoxPrimitive) {}
  zOrder(): 'bottom' { return 'bottom'; }
  renderer(): IPrimitivePaneRenderer | null { return new BoxRenderer(this._source); }
}

class BoxRenderer implements IPrimitivePaneRenderer {
  constructor(private _source: BoxPrimitive) {}
  draw(target: CanvasRenderingTarget2D): void {
    const chart = this._source.getChart();
    const series = this._source.getSeries();
    if (!chart || !series) return;
    const boxes = this._source.getBoxes();
    const timeScale = chart.timeScale();
    target.useMediaCoordinateSpace(({ context: ctx }) => {
      for (const box of boxes) {
        const x1 = timeScale.timeToCoordinate(box.time1 as unknown as Time);
        const y1 = series.priceToCoordinate(box.price1);
        const x2 = timeScale.timeToCoordinate(box.time2 as unknown as Time);
        const y2 = series.priceToCoordinate(box.price2);
        if (x1 == null || y1 == null || x2 == null || y2 == null) continue;
        const left = Math.min(x1, x2), top = Math.min(y1, y2);
        const width = Math.abs(x2 - x1), height = Math.abs(y2 - y1);
        if (box.bgColor) { ctx.fillStyle = box.bgColor; ctx.fillRect(left, top, width, height); }
        if (box.borderColor) {
          ctx.strokeStyle = box.borderColor; ctx.lineWidth = box.borderWidth ?? 1;
          if (box.borderStyle === 'dashed') ctx.setLineDash([6, 3]);
          else if (box.borderStyle === 'dotted') ctx.setLineDash([2, 2]);
          else ctx.setLineDash([]);
          ctx.strokeRect(left, top, width, height); ctx.setLineDash([]);
        }
      }
    });
  }
}
