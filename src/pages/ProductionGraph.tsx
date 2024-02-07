import { useLayoutEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import useStore from '../stores';
import ReactFlow, { Background } from 'reactflow';

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
    <ReactFlow
      nodes={store.nodes}
      edges={store.edges}
      onNodesChange={store.onNodesChange}
      onEdgesChange={store.onEdgesChange}
      onConnect={store.onConnect}
      fitView
      // TODO: Make a better attribution, then hide this (It doesn't look good with this background)
      proOptions={{ hideAttribution: false }}
    >
      <Background />
    </ReactFlow>
  );
}

export default ProductionGraph;
