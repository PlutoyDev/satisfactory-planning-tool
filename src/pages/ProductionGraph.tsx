import { useLayoutEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import useStore, { type EditingState } from '../stores';

export const routePattern = '/production-lines/:id' as const;

export function ProductionGraph() {
  const [, params] = useRoute(routePattern);
  const [, navigate] = useLocation();
  const store = useStore();

  useLayoutEffect(() => {
    // Set store.state into editing
    if (!params?.id) {
      navigate('/');
      return;
    }

    if (params.id === 'create') {
      const id = store.createProdLine();
      navigate(`/production-lines/${id}`, { replace: true });
      return;
    }

    store.loadProdLine(params.id);
  }, [params?.id, navigate, store.createProdLine, store.loadProdLine]);

  if (store.state !== 'editing') {
    if (store.state === 'loading' || store.state === 'home') {
      return <div className='skeleton w-full h-full' />;
    }
    if (store.state === 'loading-error') {
      return 'Error loading production line. More detail in the console';
    }
  }

  return (
    <div>
      <h1>Production Graph</h1>
      <p>Production ID: {store.info.id}</p>
    </div>
  );
}

export default ProductionGraph;
