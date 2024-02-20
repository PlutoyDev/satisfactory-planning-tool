import * as idb from 'idb';
import type { Node, Edge, Viewport } from 'reactflow';
import type { ProductionLineInfo, SavedNode, SavedEdge } from './productionLine';
import { convertToSavedEdge, convertToSavedNode } from './productionLine';
import omit from 'lodash/omit';
import pick from 'lodash/pick';

type DbInfo = ProductionLineInfo | (ProductionLineInfo & Viewport);
type DbNode = SavedNode & { prodLineId: string };
type DbEdge = SavedEdge & { prodLineId: string };

const convertToDbInfo = (info: ProductionLineInfo, viewport?: Viewport): DbInfo => (viewport ? { ...info, ...viewport } : info);
const convertToDbNode = (node: SavedNode, prodLineId: string): DbNode => ({ ...node, prodLineId });
const convertToDbEdge = (edge: SavedEdge, prodLineId: string): DbEdge => ({ ...edge, prodLineId });

const convertFromDbInfo = ({ id, title, icon, ...viewport }: DbInfo): [ProductionLineInfo, Viewport] => [
  { id, title, icon },
  Object.keys(viewport).length ? (viewport as Viewport) : { zoom: 1, x: 0, y: 0 },
];
const convertFromDbNode = (node: DbNode): SavedNode => omit(node, 'prodLineId');
const convertFromDbEdge = (edge: DbEdge): SavedEdge => omit(edge, 'prodLineId');

interface ProductionLineDbSchema extends idb.DBSchema {
  infos: {
    key: string;
    value: DbInfo;
  };
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

function openDb() {
  return idb.openDB<ProductionLineDbSchema>('productionLine', 1, {
    upgrade(db) {
      db.createObjectStore('infos', { keyPath: 'id' });
      db.createObjectStore('nodes', { keyPath: 'id' }).createIndex('prodLineId', 'prodLineId');
      db.createObjectStore('edges', { keyPath: 'id' }).createIndex('prodLineId', 'prodLineId');
    },
  });
}

export async function loadProductionLineInfosFromIdb() {
  const db = await openDb();
  const infos = await db.getAll('infos');
  db.close();
  return infos;
}

export async function saveProductionLineInfosToIdb(infos: ProductionLineInfo[]) {
  const db = await openDb();
  const tx = db.transaction('infos', 'readwrite');
  const existing = await tx.store.getAll();
  const toDeleteIds: string[] = existing.map(({ id }) => id); // Add all existing ids to delete
  const toPut: DbInfo[] = [];
  for (const info of infos) {
    toDeleteIds.splice(toDeleteIds.indexOf(info.id), 1); // If the id exists, remove it from the delete list
    const eInfo = existing.find(({ id }) => id === info.id); //Need to keep the viewport if it exists
    toPut.push({ ...eInfo, ...info });
  }
  const promises = [...toDeleteIds.map(id => tx.store.delete(id)), ...toPut.map(info => tx.store.put(info)), tx.done];
  await Promise.all(promises);
  db.close();
}

export async function loadProductionLineFromIdb(id: string, db?: Awaited<ReturnType<typeof openDb>>) {
  let shouldClose = false;
  if (!db) {
    shouldClose = true;
    db = await openDb();
  }

  const [combinedInfo, nodes, edges] = await Promise.all([
    db.get('infos', id),
    db.getAllFromIndex('nodes', 'prodLineId', id).then(nds => nds.map(convertFromDbNode)),
    db.getAllFromIndex('edges', 'prodLineId', id).then(eds => eds.map(convertFromDbEdge)),
  ]);

  if (shouldClose) {
    db.close();
  }

  if (!combinedInfo) {
    throw new Error(`Production line with id ${id} not found`);
  }

  const [info, viewport] = convertFromDbInfo(combinedInfo);

  return { info, nodes, edges, viewport };
}

export async function saveFullProductionLineToIdb(info: ProductionLineInfo, nodes: Node[], edges: Edge[], viewport?: Viewport) {
  const db = await openDb();
  const { nodes: eNodes, edges: eEdges } = await loadProductionLineFromIdb(info.id, db);

  const delNodeIds = eNodes.reduce((acc, { id }) => (nodes.find(n => n.id === id) ? acc : [...acc, id]), [] as string[]);
  const delEdgeIds = eEdges.reduce((acc, { id }) => (edges.find(e => e.id === id) ? acc : [...acc, id]), [] as string[]);

  const tx = db.transaction(['infos', 'nodes', 'edges'], 'readwrite');
  const [infosStore, nodesStore, edgesStore] = [tx.objectStore('infos'), tx.objectStore('nodes'), tx.objectStore('edges')];

  const promises = [
    infosStore.put(convertToDbInfo(info, viewport)),
    ...delNodeIds.map(id => nodesStore.delete(id)),
    ...delEdgeIds.map(id => edgesStore.delete(id)),
    ...nodes.map(node => nodesStore.put(convertToDbNode(convertToSavedNode(node), info.id))),
    ...edges.map(edge => edgesStore.put(convertToDbEdge(convertToSavedEdge(edge), info.id))),
    tx.done,
  ];

  await Promise.all(promises);
  db.close();
}

// TODO: Save Changes instead of full save, to reduce the read and writes to the db
export type SavePartialParams = {
  prodLineId: string;
  nodesDeleted?: string[];
  nodesChanged?: Node[];
  edgesDeleted?: string[];
  edgesChanged?: Edge[];
};

export async function savePartialProductionLineToIdb(params: SavePartialParams) {
  const db = await openDb();
  const tx = db.transaction(['nodes', 'edges'], 'readwrite');
  const [nodesStore, edgesStore] = [tx.objectStore('nodes'), tx.objectStore('edges')];
  console.log(params);
  const { nodesDeleted, nodesChanged, edgesDeleted, edgesChanged } = params;

  const promises = [
    ...(nodesDeleted?.map(id => nodesStore.delete(id)) ?? []),
    ...(nodesChanged?.map(node => nodesStore.put(convertToDbNode(convertToSavedNode(node), params.prodLineId))) ?? []),
    ...(edgesDeleted?.map(id => edgesStore.delete(id)) ?? []),
    ...(edgesChanged?.map(edge => edgesStore.put(convertToDbEdge(convertToSavedEdge(edge), params.prodLineId))) ?? []),
    tx.done,
  ];

  await Promise.all(promises);
  db.close();
}
