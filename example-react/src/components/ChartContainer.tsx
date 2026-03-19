import { useRef, useEffect } from 'react';
import { ChartManager } from '../chart';
import type { Bar } from 'oakscriptjs';

interface ChartContainerProps {
  bars: Bar[];
  onChartReady: (manager: ChartManager) => void;
}

export default function ChartContainer({ bars, onChartReady }: ChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartManagerRef = useRef<ChartManager | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const manager = new ChartManager(containerRef.current);
    chartManagerRef.current = manager;
    onChartReady(manager);
    return () => {
      manager.dispose();
      chartManagerRef.current = null;
    };
  }, [onChartReady]);

  useEffect(() => {
    if (chartManagerRef.current && bars.length > 0) {
      chartManagerRef.current.setCandlestickData(bars);
    }
  }, [bars]);

  return <div ref={containerRef} id="chart-container" />;
}
