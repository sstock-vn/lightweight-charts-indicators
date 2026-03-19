import { useState, useEffect, useCallback } from 'react';
import type { Bar } from 'oakscriptjs';
import { loadCSV } from './data-loader';
import { ChartManager } from './chart';
import ChartContainer from './components/ChartContainer';
import IndicatorPanel from './components/IndicatorPanel';
import './App.css';

export default function App() {
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartManager, setChartManager] = useState<ChartManager | null>(null);

  useEffect(() => {
    loadCSV('./data/SPX.csv')
      .then((data) => {
        console.log(`Loaded ${data.length} bars of SPX data`);
        setBars(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load data:', err);
        setError(String(err));
        setLoading(false);
      });
  }, []);

  const handleChartReady = useCallback((manager: ChartManager) => {
    setChartManager(manager);
  }, []);

  return (
    <>
      <header>
        <h1>lightweight-charts-indicators Demo (React)</h1>
        <p>Technical indicators using LightweightCharts v5</p>
      </header>
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
    </>
  );
}
