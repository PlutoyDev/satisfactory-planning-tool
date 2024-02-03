import { useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';

export function ProductionGraph() {
  const [match, params] = useRoute('/production/:id');
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!match) {
      navigate('/');
    }
  }, [match, navigate]);

  return (
    <div>
      <h1>Production Graph</h1>
      <p>Production ID: {params?.id}</p>
    </div>
  );
}
