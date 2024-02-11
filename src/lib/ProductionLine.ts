import * as idb from 'idb';
import { nanoid } from 'nanoid';
import type { Edge, Node, Viewport } from 'reactflow';

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
  viewport: {
    key: string;
    value: Viewport & { prodLineId: string };
    indexes: { prodLineId: string };
  };
}

interface LoadProductionLineArgs {
  prodLineId?: string;
}

function openProdLineDb() {
  // Open the nodes and edges db and return them
  return idb.openDB<IProductionLineDb>('prodLines', 1, {
    upgrade(db) {
      db.createObjectStore('nodes', { keyPath: 'id' }).createIndex('prodLineId', 'prodLineId');
      db.createObjectStore('edges', { keyPath: 'id' }).createIndex('prodLineId', 'prodLineId');
      db.createObjectStore('viewport', { keyPath: 'prodLineId' });
    },
  });
}

async function loadFromDb(id: string) {
  const db = await openProdLineDb();
  const [nodes, edges, viewport] = await Promise.all([
    db.getAllFromIndex('nodes', 'prodLineId', id),
    db.getAllFromIndex('edges', 'prodLineId', id),
    db.get('viewport', id),
  ]);

  db.close();
  return { nodes, edges, viewport };
}

export function loadProductionLine({ prodLineId }: LoadProductionLineArgs) {
  if (!prodLineId) {
    return Promise.resolve({ nodes: [], edges: [], viewport: { zoom: 1, x: 0, y: 0 } });
  }

  return loadFromDb(prodLineId);
}

export interface SaveProductionLineArgs {
  prodLineId?: string;
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
}

async function saveToDb(param: SaveProductionLineArgs) {
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
    db.put('viewport', { ...param.viewport, prodLineId }),
  ]);
  db.close();
}

export function saveProductionLine(args: SaveProductionLineArgs) {
  return saveToDb(args);
}
