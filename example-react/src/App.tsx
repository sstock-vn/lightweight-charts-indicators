import { useState, useEffect } from 'react';
import type { Bar } from 'oakscriptjs';
import { loadCSV } from './data-loader';
import IchimokuChart from './components/IchimokuChart';
import './App.css';

export default function App() {
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <>
      <header>
        <h1>Ichimoku Cloud Demo</h1>
        <p>SPX with Ichimoku Cloud overlay using lightweight-charts-react-components</p>
      </header>
      <div className="main-container">
        {loading ? (
          <div className="loading">Loading chart data...</div>
        ) : error ? (
          <div className="error">Failed to load data: {error}</div>
        ) : (
          <IchimokuChart bars={bars} />
        )}
      </div>
    </>
  );
}
