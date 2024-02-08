import { useRef } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useState, useCallback } from 'react';
import ReactFlow, {
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

export const routePattern = '/production-lines/:id' as const;

// Indexdb for storing production line data
type DbNode = Pick<Node, 'id' | 'type' | 'data' | 'position'> & {
  productionLineId: string;
};

type DbEdge = Pick<
  Edge,
  'id' | 'type' | 'data' | 'source' | 'target' | 'sourceHandle' | 'targetHandle'
> & {
  productionLineId: string;
};

interface IProductionLineDb extends idb.DBSchema {
  nodes: {
    key: string;
    value: DbNode;
    indexes: { productionLineId: string };
  };
  edges: {
    key: string;
    value: DbEdge;
    indexes: { productionLineId: string };
  };
}

// Production Line Id is nanoid(8)
// Node id

function openProdLineDb() {
  // Open the nodes and edges db and return them
  return idb.openDB<IProductionLineDb>('prodLines', 1, {
    upgrade(db) {
      db.createObjectStore('nodes', { keyPath: 'id' }).createIndex(
        'productionLineId',
        'productionLineId'
      );
      db.createObjectStore('edges', { keyPath: 'id' }).createIndex(
        'productionLineId',
        'productionLineId'
      );
    },
  });
}

export function ProductionGraph() {
  const elRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const [, params] = useRoute(routePattern);
  const [, navigate] = useLocation();

  const onNodesChange: OnNodesChange = useCallback(
    changes => setNodes(nds => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    changes => setEdges(eds => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect: OnConnect = useCallback(
    connection => setEdges(edges => addEdge(connection, edges)),
    []
  );

  const loadProductionLine = useCallback(async (prodLineId: string) => {
    const db = await openProdLineDb();
    const [nodes, edges] = await Promise.all([
      db.getAllFromIndex('nodes', 'productionLineId', prodLineId),
      db.getAllFromIndex('edges', 'productionLineId', prodLineId),
    ]);
    setNodes(nodes);
    setEdges(edges);
    db.close();
  }, []);

  const saveProductionLine = useCallback(
    async (prodLineId: string, nodes: Node[], edges: Edge[]) => {
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
            productionLineId: prodLineId,
          })
        ),
        ...edges.map(
          ({ id, type, data, source, target, sourceHandle, targetHandle }) =>
            edgeTx.store.put({
              id,
              type,
              data,
              source,
              target,
              sourceHandle,
              targetHandle,
              productionLineId: prodLineId,
            })
        ),
        nodeTx.done,
        edgeTx.done,
      ]);
      if (res.some(r => r.status === 'rejected')) {
        // TODO: Show error to user
        console.error(
          'Failed to save production line',
          res
            .filter(r => r.status === 'rejected')
            .map(r => (r as PromiseRejectedResult).reason)
        );
        // TODO: Rollback changes
      }
      db.close();
    },
    []
  );

  useLegacyEffect(() => {
    //Loading
    setLoading(true);
    if (params?.id) {
      console.log('Loading production line', params.id);
      loadProductionLine(params.id).then(() => setLoading(false));
    }
  }, [params?.id, loadProductionLine]);

  if (loading) {
    return <div className='skeleton w-full h-full' />;
  }

  return (
    <div className='w-full h-full' ref={elRef}>
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
        <Background />
      </ReactFlow>
    </div>
  );
}

export default ProductionGraph;
