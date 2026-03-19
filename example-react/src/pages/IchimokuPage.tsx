/**
 * Page: Standalone Ichimoku Cloud chart.
 */

import { useState, useEffect } from 'react';
import type { Bar } from 'oakscriptjs';
import { loadCSV } from '../data-loader';
import IchimokuChart from '../components/IchimokuChart';

export default function IchimokuPage() {
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCSV('./data/SPX.csv')
      .then((data) => { setBars(data); setLoading(false); })
      .catch((err) => { setError(String(err)); setLoading(false); });
  }, []);

  return (
    <div className="main-container">
      {loading ? (
        <div className="loading">Loading chart data...</div>
      ) : error ? (
        <div className="error">Failed to load data: {error}</div>
      ) : (
        <IchimokuChart bars={bars} />
      )}
    </div>
  );
}
