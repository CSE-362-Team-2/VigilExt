import { useEffect, useState } from 'react';

type Health = { status: string; service: string };

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Health>;
      })
      .then(setHealth)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'request failed');
      });
  }, []);

  return (
    <main className="page">
      <h1>VigilNext</h1>
      <p>Risk-aware payment gateway. Week 1 skeleton: API status only.</p>
      {health && (
        <p className="ok">
          API reachable: {health.service} is {health.status}
        </p>
      )}
      {error && <p className="bad">API unreachable: {error}</p>}
      {!health && !error && <p>Checking API health…</p>}
    </main>
  );
}
