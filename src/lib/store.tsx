// Production Line Context.
// This context is used manage the state of the production line.
import { createContext, useRef, useContext } from 'react';
import { createStore, useStore } from 'zustand';
import { useLocation } from 'wouter';
import { nanoid } from 'nanoid';
import {
  SavePartialParams,
  loadProductionLineFromIdb,
  loadProductionLineInfosFromIdb,
  saveFullProductionLineToIdb,
  savePartialProductionLineToIdb,
  saveProductionLineInfosToIdb,
} from './productionLineDb';

import type { DragEvent } from 'react';
import type {
  Node,
  Edge,
  Viewport,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  ReactFlowInstance,
  OnSelectionChangeFunc,
  NodeChange,
} from 'reactflow';
import type { NodeTypeKeys, FactoryNodeProperties } from '../components/FactoryGraph';
import { pick } from 'lodash';
import { ProductionLineInfo } from './productionLine';
import { Docs, useDocs } from '../context/DocsContext';

type NavigateFn = ReturnType<typeof useLocation>[1];
type DeboucedCollectedChanges = {
  nodeDeleted: Set<string>;
  nodeChanged: Set<string>;
  edgeDeleted: Set<string>;
  edgeChanged: Set<string>;
};

type ProcessedChanges = {
  nodesDeleted?: string[];
  nodesChanged?: Node[];
  edgesDeleted?: string[];
  edgesChanged?: Edge[];
};

const createDeboucedCollectedChanges = (): DeboucedCollectedChanges => ({
  nodeDeleted: new Set(),
  nodeChanged: new Set(),
  edgeDeleted: new Set(),
  edgeChanged: new Set(),
});

type PredictionControl = {
  layout: 'manifold' | 'loadbalanced';
  recipeIndex: number;
  maxOverclocking: false | number;
};

interface AppState {
  loading?: false | 'docsJson' | 'infos' | 'productionLine';

  saving?: false | 'infos' | 'productionLine';
  error?: Error | string;

  isSaved?: boolean;

  /** Production Line Infos: for the production line list */
  productionLineInfos: ProductionLineInfo[];
  /** Set the production line infos */
  setProductionLineInfos: (infos: ProductionLineInfo[] | ((infos: ProductionLineInfo[]) => ProductionLineInfo[])) => void;
  /** Helper function to load Infos from IndexedDB
   *
   * Call setProductionLineInfos internally
   */
  loadProductionLineInfosFromIdb: () => void;
  /**
   * Helper functions to create a new production line and navigate to it
   *
   * Call setProductionLineInfos internally
   */
  createProductionLine: () => void;

  /** Production Line State: for the production line page */
  selInfo: ProductionLineInfo | undefined;
  /** Production Line Nodes */
  nodes: Node[];
  /** Production Line Edges */
  edges: Edge[];
  /** Reactflow Instance */
  rfInstance?: ReactFlowInstance;
  /** Setter for reactflow instance */
  setRfInstance: (instance: ReactFlowInstance) => void;

  /** Load a production line */
  loadProductionLineFromIdb: (id: string) => void;
  /** Save the production line to IndexedDB */
  saveFullProductionLineToIdb: () => void;

  selNode?: Node;
  selEdge?: Edge;

  collectedChanges: DeboucedCollectedChanges;
  deboucingTimeout?: number;
  deboucedChanges: () => void;
  deboucedCallback: () => void;

  partialSave: (collectedChanges: ProcessedChanges) => void;
  /** Map of node id and handle id to item and required (-) / produced (+) speed */
  dcHandles: Map<`${string}-${string}`, { itemKey: string; speed: number }>;
  detectDcHandles: (collectedChanges: ProcessedChanges) => void;
  /** Map of node id and handle id to prediction control */
  predictionControls: Map<string, PredictionControl>;
  generatePredictionControl: (id: `${string}-${string}`, update?: Partial<PredictionControl>) => void;

  /**
   * Update the node data
   * @param data The new data
   * @param id The id of the node to update. If not provided, the selected node will be updated
   */
  updateNodeData: (data: any, id?: string) => void;

  /**
   * Update the edge data
   * @param data The new data
   * @param id The id of the edge to update. If not provided, the selected edge will be updated
   */
  updateEdgeData: (data: any, id?: string) => void;

  // Reactflow callbacks
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onSelectionChange: OnSelectionChangeFunc;

  // Reactflow div callbacks
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
}

export function createApplicaionStore(navigate: NavigateFn, { items, recipes }: Docs) {
  return createStore<AppState>((set, get) => ({
    productionLineInfos: [],
    setProductionLineInfos: infos => {
      const selInfo = get().selInfo;
      if (typeof infos === 'function') {
        infos = infos(get().productionLineInfos);
      }
      set({
        productionLineInfos: infos,
        selInfo: (selInfo && infos.find(info => info.id === selInfo.id)) || undefined,
      });
      saveProductionLineInfosToIdb(infos).catch(error => set({ error }));
    },
    loadProductionLineInfosFromIdb: () => {
      set({ loading: 'infos' });
      loadProductionLineInfosFromIdb()
        .then(infos => set({ productionLineInfos: infos, loading: false }))
        .catch(error => set({ error }));
    },
    createProductionLine: () => {
      const id = nanoid();
      set({ loading: 'productionLine' });
      navigate(`/production-line/${id}`);
      const infos = get().productionLineInfos;
      const newInfo: ProductionLineInfo = { id, title: 'Untitled', icon: '???' };
      const newInfos = [...infos, newInfo];
      get().setProductionLineInfos(newInfos);
      set({ selInfo: newInfo, nodes: [], edges: [], isSaved: true, loading: false });
    },
    selInfo: undefined,
    nodes: [],
    edges: [],
    rfInstance: undefined,
    setRfInstance: rfInstance => set({ rfInstance }),

    loadProductionLineFromIdb: id => {
      const { selInfo, nodes, edges, rfInstance } = get();
      set({ loading: 'productionLine' });
      (selInfo ? saveFullProductionLineToIdb(selInfo!, nodes, edges, rfInstance?.getViewport()) : Promise.resolve())
        .then(() => loadProductionLineFromIdb(id))
        .then(({ info, nodes, edges }) => {
          set({ selInfo: info, nodes, edges, loading: false, selNode: undefined, selEdge: undefined, isSaved: true });
          navigate(`/production-line/${id}`);
        })
        .catch(error => set({ error }));
    },
    saveFullProductionLineToIdb: () => {
      set({ saving: 'productionLine' });
      const { selInfo, nodes, edges, rfInstance } = get();
      const viewport = rfInstance?.getViewport();
      saveFullProductionLineToIdb(selInfo!, nodes, edges, viewport)
        .then(() => set({ saving: false, isSaved: true }))
        .catch(error => set({ error }));
    },
    collectedChanges: createDeboucedCollectedChanges(),
    deboucingTimeout: undefined,
    deboucedChanges: () => {
      const { deboucingTimeout, deboucedCallback } = get();
      if (deboucingTimeout) {
        clearTimeout(deboucingTimeout);
      }
      const timeout = setTimeout(deboucedCallback, 5000);
      set({ deboucingTimeout: timeout });
    },
    deboucedCallback: () => {
      const { nodes, edges, deboucingTimeout, collectedChanges, partialSave, detectDcHandles } = get();
      if (deboucingTimeout) {
        clearTimeout(deboucingTimeout);
      }

      set({ deboucingTimeout: undefined, collectedChanges: createDeboucedCollectedChanges() });
      // Process the collected changes
      const { nodeDeleted, nodeChanged, edgeDeleted, edgeChanged } = collectedChanges;
      const nd = Array.from(nodeDeleted).filter(id => !id.startsWith('predict'));
      const nc = nodes.filter(n => nodeChanged.has(n.id) && !nodeDeleted.has(n.id) && !n.id.startsWith('predict'));
      const ed = Array.from(edgeDeleted).filter(id => !id.startsWith('predict'));
      const ec = edges.filter(e => edgeChanged.has(e.id) && !edgeDeleted.has(e.id) && !e.id.startsWith('predict'));

      if (nd.length === 0 && nc.length === 0 && ed.length === 0 && ec.length === 0) {
        // Nothing to do
        return;
      }

      const processedChanges = {
        nodesDeleted: nd.length > 0 ? nd : undefined,
        nodesChanged: nc.length > 0 ? nc : undefined,
        edgesDeleted: ed.length > 0 ? ed : undefined,
        edgesChanged: ec.length > 0 ? ec : undefined,
      };

      partialSave(processedChanges);
      detectDcHandles(processedChanges);
    },
    partialSave: processedChanges => {
      const { selInfo } = get();
      if (!selInfo) {
        return;
      }

      set({ saving: 'productionLine' });

      savePartialProductionLineToIdb({
        prodLineId: selInfo.id,
        ...processedChanges,
      })
        .then(() => set({ saving: false, isSaved: true }))
        .catch(error => set({ error }));
    },
    dcHandles: new Map(),
    detectDcHandles: processedChanges => {
      const { nodes, edges, dcHandles } = get();
      const nonPredictedNodes = nodes.filter(n => !n.id.startsWith('predict'));
      const nonPredictedEdges = edges.filter(e => !e.id.startsWith('predict'));

      // Group the edges by source and target
      const groupedEdges = new Map<string, { source: Edge[]; target: Edge[] }>();
      for (const edge of nonPredictedEdges) {
        const source = (groupedEdges.get(edge.source) || { source: [], target: [] }).source;
        source.push(edge);
        if (!groupedEdges.has(edge.source)) {
          groupedEdges.set(edge.source, { source, target: [] });
        }

        const target = (groupedEdges.get(edge.target) || { source: [], target: [] }).target;
        target.push(edge);
        if (!groupedEdges.has(edge.target)) {
          groupedEdges.set(edge.target, { source: [], target });
        }
      }

      // Item node has 2 handles, 1 for input and 1 for output
      // Recipe node handle count depends on the ingredients and products
      // gather the disconnected handles and their required/produced speed

      for (const node of nonPredictedNodes) {
        const { source, target } = groupedEdges.get(node.id) || { source: [], target: [] };
        if (node.type === 'item') {
          if (!node.data.itemId || !node.data.speed) continue;
          // 0 for input, 1 for output according to factoryIO array in source code
          const hasInputEdge = target.some(e => e.targetHandle === '0');
          if (!hasInputEdge) {
            dcHandles.set(`${node.id}-0`, { itemKey: node.data.itemId, speed: -node.data.speed });
          }
          const hasOutputEdge = source.some(e => e.sourceHandle === '1');
          if (!hasOutputEdge) {
            dcHandles.set(`${node.id}-1`, { itemKey: node.data.itemId, speed: node.data.speed });
          }
        } else if (node.type === 'recipe') {
          if (!node.data.recipeId) continue;
          const recipe = recipes[node.data.recipeId];
          if (!recipe || !recipe.ingredients || !recipe.products) continue;
          // id is indexed by ingredient then product
          const { manufactoringDuration: durationSec, ingredients, products } = recipe;
          const duration = durationSec / 60;
          const numHandles = ingredients.length + products.length;
          for (let i = 0; i < numHandles; i++) {
            if (i < ingredients.length) {
              const hasInputEdge = target.some(e => e.targetHandle === `${i}`);
              if (!hasInputEdge) {
                const { itemKey, amount } = recipe.ingredients[i];
                const speed = -amount / duration;
                dcHandles.set(`${node.id}-${i}`, { itemKey, speed });
              }
            } else {
              const hasOutputEdge = source.some(e => e.sourceHandle === `${i - ingredients.length}`);
              if (!hasOutputEdge) {
                const { itemKey, amount } = recipe.products[i - ingredients.length];
                const speed = amount / duration;
                dcHandles.set(`${node.id}-${i}`, { itemKey, speed });
              }
            }
          }
        }
      }
    },
    predictionControls: new Map(),
    generatePredictionControl: (id, update) => {
      const [nodeId, handleId] = id.split(':');
      const { predictionControls, nodes, edges, dcHandles } = get();
      const toFulfill = dcHandles.get(id);
      let control = predictionControls.get(id) || { layout: 'manifold', recipeIndex: 0, maxOverclocking: false };
      control = { ...control, ...update };
      predictionControls.set(id, control);
      // remove all nodes and edges with id starting with 'predict:{node+handleId}:{nanoid}'
      let nodeToPredict: FactoryNodeProperties | undefined = undefined;
      const nodesToRemove = new Set<string>();
      for (const node of nodes) {
        if (node.id.startsWith(`predict:${id}:`)) {
          nodesToRemove.add(node.id);
        }
        if (node.id === nodeId) {
          nodeToPredict = node as FactoryNodeProperties;
        }
      }
      const edgesToRemove = new Set<string>();
      for (const edge of edges) {
        if (edge.id.startsWith(`predict:${id}:`)) {
          edgesToRemove.add(edge.id);
        }
      }

      if (!nodeToPredict || !toFulfill) {
        return;
      }

      const {
        position: nodePosition,
        data: { rotation },
      } = nodeToPredict;
      const { layout, recipeIndex, maxOverclocking } = control;
      const { itemKey, speed } = toFulfill;

      const usableRecipes = speed > 0 ? items[itemKey].ingredientOf : items[itemKey].productOf;

      if (!usableRecipes || usableRecipes.length === 0) {
        return;
      }

      const recipeId = usableRecipes[recipeIndex % usableRecipes.length];
      const recipe = recipes[recipeId];

      if (!recipe) {
        return;
      }

      const { ingredients, products, manufactoringDuration } = recipe;
      const baseAmount = (speed > 0 ? products : ingredients).find(p => p.itemKey === itemKey)?.amount;
      if (!baseAmount) {
        return;
      }
      const baseSpeed = (baseAmount * 60) / manufactoringDuration;
      const targetSpeed = Math.abs(speed);
      const speedRatio = targetSpeed / baseSpeed;
    },
    updateNodeData: (data, id) => {
      const nodes = get().nodes;
      id = id || get().selNode?.id;
      if (!id) {
        return;
      }

      set({ nodes: nodes.map(n => (n.id === id ? { ...n, data } : n)), isSaved: false });
    },
    updateEdgeData: (data, id) => {
      const edges = get().edges;
      id = id || get().selEdge?.id;
      if (!id) {
        return;
      }

      set({ edges: edges.map(e => (e.id === id ? { ...e, data } : e)), isSaved: false });
    },
    onNodesChange: changes => {
      const { nodes: eNodes, selNode, deboucedChanges, collectedChanges } = get();
      const changedMap = new Map<string, Node>();
      const saveableChangeNodeIds = new Set<string>();
      const deleteNodeIds = new Set<string>();

      for (const change of changes) {
        if (change.type === 'add') {
          changedMap.set(change.item.id, change.item);
          saveableChangeNodeIds.add(change.item.id);
        } else if (change.type === 'remove') {
          deleteNodeIds.add(change.id);
        } else if (change.type === 'reset') {
          changedMap.set(change.item.id, change.item);
          saveableChangeNodeIds.add(change.item.id);
        } else {
          let node = changedMap.get(change.id);
          if (!node) {
            node = eNodes.find(n => n.id === change.id);
            if (node) {
              node = { ...node }; // Make a copy, the node will be mutated in the next step
              changedMap.set(node.id, node);
            } else {
              throw new Error(`Node with id ${change.id} not found`);
            }
          }

          if (change.type === 'position') {
            const { position, positionAbsolute, dragging } = change;
            if (position) {
              node.position = position;
              saveableChangeNodeIds.add(node.id);
            }
            if (positionAbsolute) {
              node.positionAbsolute = positionAbsolute;
            }
            if (dragging !== undefined) {
              node.dragging = dragging;
            }
          } else if (change.type === 'dimensions') {
            const { dimensions, resizing } = change;
            if (dimensions) {
              node.width = dimensions.width;
              node.height = dimensions.height;
            }
            if (resizing !== undefined) {
              node.resizing = resizing;
            }
          } else if (change.type === 'select') {
            const { selected } = change;
            node.selected = selected;
          }
        }
      }

      set({
        nodes: [...changedMap.values(), ...eNodes.filter(n => !changedMap.has(n.id) && !deleteNodeIds.has(n.id))],
        selNode: selNode && (changedMap.has(selNode?.id) ? changedMap.get(selNode.id) : selNode),
        isSaved: false,
      });

      if (saveableChangeNodeIds.size > 0 || deleteNodeIds.size > 0) {
        saveableChangeNodeIds.forEach(id => collectedChanges.nodeChanged.add(id));
        deleteNodeIds.forEach(id => collectedChanges.nodeDeleted.add(id));
        deboucedChanges();
      }
    },
    onEdgesChange: changes => {
      // const eEdges = get().edges;
      const { edges: eEdges, selEdge, deboucedChanges, collectedChanges } = get();
      const changedMap = new Map<string, Edge>();
      const saveableChangeEdgeIds = new Set<string>();
      const removeEdgeIds = new Set<string>();

      for (const change of changes) {
        if (change.type === 'add') {
          changedMap.set(change.item.id, change.item);
          saveableChangeEdgeIds.add(change.item.id);
        } else if (change.type === 'remove') {
          removeEdgeIds.add(change.id);
        } else if (change.type === 'reset') {
          changedMap.set(change.item.id, change.item);
          saveableChangeEdgeIds.add(change.item.id);
        } else {
          let edge = changedMap.get(change.id);
          if (!edge) {
            edge = eEdges.find(e => e.id === change.id);
            if (edge) {
              edge = { ...edge }; // Make a copy, the edge will be mutated in the next step
              changedMap.set(edge.id, edge);
            } else {
              throw new Error(`Edge with id ${change.id} not found`);
            }
          }

          if (change.type === 'select') {
            const { selected } = change;
            edge.selected = selected;
          }
        }
      }

      set({
        edges: [...changedMap.values(), ...eEdges.filter(e => !changedMap.has(e.id) && !removeEdgeIds.has(e.id))],
        selEdge: selEdge && (changedMap.has(selEdge?.id) ? changedMap.get(selEdge.id) : selEdge),
        isSaved: false,
      });

      if (saveableChangeEdgeIds.size > 0 || removeEdgeIds.size > 0) {
        saveableChangeEdgeIds.forEach(id => collectedChanges.edgeChanged.add(id));
        removeEdgeIds.forEach(id => collectedChanges.edgeDeleted.add(id));
        deboucedChanges();
      }
    },
    onConnect: conn => {
      // const eEdges = get().edges;
      const { edges: eEdges, onEdgesChange, onSelectionChange } = get();

      if (!conn.source || !conn.target) {
        return;
      }

      if (eEdges.some(e => (['source', 'target', 'sourceHandle', 'targetHandle'] as const).every(k => e[k] === conn[k]))) {
        return;
      }

      const edge: Edge = {
        id: nanoid(),
        type: 'smoothstep',
        data: {},
        source: conn.source!,
        target: conn.target!,
        sourceHandle: conn.sourceHandle === null ? undefined : conn.sourceHandle,
        targetHandle: conn.targetHandle === null ? undefined : conn.targetHandle,
        selected: true,
      };

      onEdgesChange([{ type: 'add', item: edge }]);
      onSelectionChange({ nodes: [], edges: [edge] });
    },
    onDrop: e => {
      e.preventDefault();
      const { rfInstance, selNode, onNodesChange, onSelectionChange } = get();
      const type = e.dataTransfer.getData('application/reactflow') as NodeTypeKeys;
      if (!type || !rfInstance) {
        return;
      }
      const position = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const node = { id: nanoid(), type, position, selected: true, data: {} };
      const changes: NodeChange[] = [{ type: 'add', item: node }];
      if (selNode) {
        changes.push({ type: 'select', id: selNode.id, selected: false });
      }
      onNodesChange(changes);
      onSelectionChange({ nodes: [node], edges: [] });
    },
    onSelectionChange: ({ nodes, edges }) => {
      const { selNode, selEdge } = get();
      if (nodes.length === 0 && selNode) {
        set({ selNode: undefined });
      }
      if (edges.length === 0 && selEdge) {
        set({ selEdge: undefined });
      }
      if (nodes.length === 1 && edges.length === 0) {
        set({ selNode: nodes[0] });
      }
      if (edges.length === 1 && nodes.length === 0) {
        set({ selEdge: edges[0] });
      }
    },
  }));
}

type ProductionLineStore = ReturnType<typeof createApplicaionStore>;

// The production line context
const ProductionLineStoreContext = createContext<ProductionLineStore>(null!);

// The production line provider
export function ProductionLineStoreProvider({ children }: { children: React.ReactNode }) {
  const docs = useDocs();
  const navigate = useLocation()[1];
  const storeRef = useRef<ProductionLineStore>();
  if (!storeRef.current) {
    storeRef.current = createApplicaionStore(navigate, docs);
  }
  return <ProductionLineStoreContext.Provider value={storeRef.current}>{children}</ProductionLineStoreContext.Provider>;
}

// The production line hook
export function useProductionLineStore(): AppState;
export function useProductionLineStore<T>(selector: (state: AppState) => T): T;
export function useProductionLineStore<T extends keyof AppState>(...args: T[]): Pick<AppState, T>;

export function useProductionLineStore(selector?: ((state: AppState) => any) | keyof AppState, ...args: (keyof AppState)[]) {
  const store = useContext(ProductionLineStoreContext);
  if (!store) {
    throw new Error('useProductionLine must be used within a ProductionLineProvider');
  }
  if (!selector) {
    return useStore(store);
  } else if (typeof selector === 'string') {
    return useStore(store, state => {
      return pick(state, [selector, ...args]);
    });
  } else {
    return useStore(store, selector);
  }
}

if (import.meta.hot) {
  import.meta.hot.accept(m => {
    import.meta.hot!.invalidate('store is not hot-reloadable');
  });
}
