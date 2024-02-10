import React, { useRef } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useState, useCallback } from 'react';
import ReactFlow, {
  Panel,
  Background,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Node,
  type Edge,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
} from 'reactflow';
import * as idb from 'idb';
import useLegacyEffect from '../hooks/useLegacyEffect';
import { ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/24/outline';

export const routePattern = '/production-lines/:id' as const;

// Indexdb for storing production line data
type DbNode = Pick<Node, 'id' | 'type' | 'data' | 'position'> & {
  prodLineId: string;
};

type DbEdge = Pick<Edge, 'id' | 'type' | 'data' | 'source' | 'target' | 'sourceHandle' | 'targetHandle'> & {
  prodLineId: string;
};

interface IProductionLineDb extends idb.DBSchema {
  nodes: {
    key: string;
    value: DbNode;
    indexes: { prodLineId: string };
  };
  edges: {
    key: string;
    value: DbEdge;
    indexes: { prodLineId: string };
  };
}

// Production Line Id is nanoid(8)
// Node id

function openProdLineDb() {
  // Open the nodes and edges db and return them
  return idb.openDB<IProductionLineDb>('prodLines', 1, {
    upgrade(db) {
      db.createObjectStore('nodes', { keyPath: 'id' }).createIndex('prodLineId', 'prodLineId');
      db.createObjectStore('edges', { keyPath: 'id' }).createIndex('prodLineId', 'prodLineId');
    },
  });
}

export function ProductionGraph() {
  const elRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [, params] = useRoute(routePattern);
  const [, navigate] = useLocation();

  const onNodesChange: OnNodesChange = useCallback(changes => setNodes(nds => applyNodeChanges(changes, nds)), []);

  const onEdgesChange: OnEdgesChange = useCallback(changes => setEdges(eds => applyEdgeChanges(changes, eds)), []);

  const onConnect: OnConnect = useCallback(connection => setEdges(edges => addEdge(connection, edges)), []);

  const loadProductionLine = useCallback(async (prodLineId: string) => {
    const db = await openProdLineDb();
    const [nodes, edges] = await Promise.all([
      db.getAllFromIndex('nodes', 'prodLineId', prodLineId),
      db.getAllFromIndex('edges', 'prodLineId', prodLineId),
    ]);
    setNodes(nodes);
    setEdges(edges);
    db.close();
  }, []);

  const saveProductionLine = useCallback(async (prodLineId: string, nodes: Node[], edges: Edge[]) => {
    const db = await openProdLineDb();
    const nodeTx = db.transaction('nodes', 'readwrite');
    const edgeTx = db.transaction('edges', 'readwrite');
    const res = await Promise.allSettled([
      ...nodes.map(({ id, type, data, position }) =>
        nodeTx.store.put({
          id,
          type,
          data,
          position,
          prodLineId,
        }),
      ),
      ...edges.map(({ id, type, data, source, target, sourceHandle, targetHandle }) =>
        edgeTx.store.put({
          id,
          type,
          data,
          source,
          target,
          sourceHandle,
          targetHandle,
          prodLineId,
        }),
      ),
      nodeTx.done,
      edgeTx.done,
    ]);
    if (res.some(r => r.status === 'rejected')) {
      // TODO: Show error to user
      console.error(
        'Failed to save production line',
        res.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason),
      );
      // TODO: Rollback changes
    }
    db.close();
  }, []);

  useLegacyEffect(() => {
    //Loading
    setLoading(true);
    if (params?.id) {
      console.log('Loading production line', params.id);
      loadProductionLine(params.id).then(() => setLoading(false));
    }

    // Fullscreen change
    const onFullscreenChange = (e: Event) => {
      if (!document.fullscreenElement) {
        // If user exit fullscreen using the escape key or the browser's UI
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [params?.id, loadProductionLine]);

  if (loading) {
    return <div className='skeleton h-full w-full' />;
  }

  return (
    <div className='h-full w-full bg-base-300' ref={elRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        // TODO: Make a better attribution, then hide this (It doesn't look good with this background)
        proOptions={{ hideAttribution: false }}
      >
        <Panel position='top-center'>
          <div className='flex items-center space-x-2 rounded-sm bg-base-100 p-1 shadow-lg'>
            <div className='tooltip tooltip-bottom' data-tip='Save'>
              <button
                className='btn btn-square btn-ghost btn-sm'
                type='button'
                onClick={() => {
                  if (params?.id) {
                    saveProductionLine(params.id, nodes, edges);
                  } else {
                    console.error('No production line id');
                  }
                }}
              >
                💾
              </button>
            </div>
            <div className='tooltip tooltip-bottom' data-tip='Fullscreen'>
              <button
                className='btn btn-square btn-ghost btn-sm'
                type='button'
                onClick={() => {
                  if (elRef.current) {
                    if (isFullscreen) {
                      document.exitFullscreen();
                    } else {
                      elRef.current.requestFullscreen();
                    }
                    setIsFullscreen(f => !f);
                  }
                }}
              >
                {isFullscreen ? (
                  <ArrowsPointingInIcon className='h-5 w-5 text-base-content' />
                ) : (
                  <ArrowsPointingOutIcon className='h-5 w-5 text-base-content' />
                )}
              </button>
            </div>
          </div>
        </Panel>
        <Background />
      </ReactFlow>
    </div>
  );
}

// function RightSidePanel() {
//   return (
//     <div className='absolute z-[5] m-[15px] right-0 origin-center translate-y-1/2 pointer-events-none'></div>
//   );
// }

interface ExternalNodeProps {
  nodeEl: React.ReactElement;
  divElProps: React.HTMLProps<HTMLDivElement>;
}

function ExternalNode(props: ExternalNodeProps) {
  // Based on reactflow internal node component as it was not exported, so I had to make my own.
  // It doesn't have the same functionality, mainly use to render in side panel and drag into the graph
  const { nodeEl, divElProps } = props;
  return (
    <div className='user-select-none pointer-events-[all] absolute origin-center' {...divElProps}>
      {nodeEl}
    </div>
  );
}

export default ProductionGraph;
