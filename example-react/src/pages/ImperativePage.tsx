/**
 * Page: Imperative chart — without lightweight-charts-react-components.
 * Uses ChartManager (chart.ts) directly via refs.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Bar } from 'oakscriptjs';
import { loadCSV } from '../data-loader';
import { ChartManager } from '../chart';
import ChartContainer from '../components/ChartContainer';
import IndicatorPanel from '../components/IndicatorPanel';

export default function ImperativePage() {
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartManager, setChartManager] = useState<ChartManager | null>(null);

  useEffect(() => {
    loadCSV('./data/SPX.csv')
      .then((data) => { setBars(data); setLoading(false); })
      .catch((err) => { setError(String(err)); setLoading(false); });
  }, []);

  const handleChartReady = useCallback((manager: ChartManager) => {
    setChartManager(manager);
  }, []);

  return (
    <div className="main-container">
      {loading ? (
        <div className="loading">Loading chart data...</div>
      ) : error ? (
        <div className="error">Failed to load data: {error}</div>
      ) : (
        <>
          <ChartContainer bars={bars} onChartReady={handleChartReady} />
          <IndicatorPanel bars={bars} chartManager={chartManager} />
        </>
      )}
    </div>
  );
}
