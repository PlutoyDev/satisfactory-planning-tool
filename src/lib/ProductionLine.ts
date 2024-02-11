import { use } from 'react';
import { Edge, Node } from 'reactflow';
import * as idb from 'idb';
import { nanoid } from 'nanoid';

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

interface UseProductionLineArgs {
  prodLineId?: string;
}

function openProdLineDb() {
  // Open the nodes and edges db and return them
  return idb.openDB<IProductionLineDb>('prodLines', 1, {
    upgrade(db) {
      db.createObjectStore('nodes', { keyPath: 'id' }).createIndex('prodLineId', 'prodLineId');
      db.createObjectStore('edges', { keyPath: 'id' }).createIndex('prodLineId', 'prodLineId');
    },
  });
}

async function loadFromDb(id: string) {
  const db = await openProdLineDb();
  const [nodes, edges] = await Promise.all([db.getAllFromIndex('nodes', 'prodLineId', id), db.getAllFromIndex('edges', 'prodLineId', id)]);

  db.close();
  return { nodes, edges };
}

export function loadProductionLine({ prodLineId }: UseProductionLineArgs) {
  if (!prodLineId) {
    return Promise.resolve({ nodes: [], edges: [] });
  }

  return loadFromDb(prodLineId);
}

async function saveToDb(param: { prodLineId?: string; nodes: Node[]; edges: Edge[] }) {
  const prodLineId = param.prodLineId ?? (console.warn('No id provided for saving'), nanoid());
  const { nodes, edges } = param;
  const db = await openProdLineDb();
  const nodeTx = db.transaction('nodes', 'readwrite');
  const edgeTx = db.transaction('edges', 'readwrite');
  await Promise.all([
    ...nodes.map(({ id, type, data, position }) => nodeTx.store.put({ id, type, data, position, prodLineId })),
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
  db.close();
}

export function saveProductionLine({ prodLineId, nodes, edges }: { prodLineId?: string; nodes: Node[]; edges: Edge[] }) {
  use(saveToDb({ prodLineId, nodes, edges }));
}
