/**
 * Page: Declarative chart — with lightweight-charts-react-components.
 * Uses ChartView + IndicatorPanelDeclarative for fully reactive rendering.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Bar } from 'oakscriptjs';
import { loadCSV } from '../data-loader';
import type { IndicatorDisplayState } from '../display-state';
import { EMPTY_DISPLAY } from '../display-state';
import ChartView from '../components/ChartView';
import IndicatorPanelDeclarative from '../components/IndicatorPanelDeclarative';

export default function DeclarativePage() {
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [display, setDisplay] = useState<IndicatorDisplayState>(EMPTY_DISPLAY);

  useEffect(() => {
    loadCSV('./data/SPX.csv')
      .then((data) => { setBars(data); setLoading(false); })
      .catch((err) => { setError(String(err)); setLoading(false); });
  }, []);

  const handleDisplayChange = useCallback((newDisplay: IndicatorDisplayState) => {
    setDisplay(newDisplay);
  }, []);

  return (
    <div className="main-container">
      {loading ? (
        <div className="loading">Loading chart data...</div>
      ) : error ? (
        <div className="error">Failed to load data: {error}</div>
      ) : (
        <>
          <ChartView bars={bars} display={display} />
          <IndicatorPanelDeclarative bars={bars} onDisplayChange={handleDisplayChange} />
        </>
      )}
    </div>
  );
}
