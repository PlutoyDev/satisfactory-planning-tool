// Production Line Context.
// This context is used manage the state of the production line.
import { createContext, useRef, useContext } from 'react';
import { createStore, useStore } from 'zustand';
import { useLocation } from 'wouter';
import { nanoid } from 'nanoid';
import {
  loadProductionLineFromIdb,
  loadProductionLineInfosFromIdb,
  saveFullProductionLineToIdb,
  saveProductionLineInfosToIdb,
} from './productionLineDb';

import type { DragEvent } from 'react';
import type { Node, Edge, Viewport, OnNodesChange, OnEdgesChange, OnConnect, ReactFlowInstance, OnSelectionChangeFunc } from 'reactflow';
import type { NodeTypeKeys } from '../components/FactoryGraph';
import { pick } from 'lodash';

export type SavedNode = Pick<Node, 'id' | 'type' | 'data' | 'position'>;
export type SavedEdge = Pick<Edge, 'id' | 'type' | 'data' | 'source' | 'target' | 'sourceHandle' | 'targetHandle'>;

export interface SavedProductionLine {
  info: ProductionLineInfo;
  nodes: SavedNode[];
  edges: SavedEdge[];
  viewport?: Viewport;
}

type NavigateFn = ReturnType<typeof useLocation>[1];

export interface ProductionLineInfo {
  id: string;
  title: string;
  icon: string;
}

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
  /** Setter for the production line nodes*/
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  /** Production Line Edges */
  edges: Edge[];
  /** Setter for the production line edges*/
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void;
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

export function createApplicaionStore(navigate: NavigateFn) {
  return createStore<AppState>((set, get) => ({
    productionLineInfos: [],
    setProductionLineInfos: infos => {
      if (typeof infos === 'function') {
        infos = infos(get().productionLineInfos);
      }
      set({ productionLineInfos: infos });
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
      set({ selInfo: newInfo, nodes: [], edges: [], isSaved: true });
    },

    selInfo: undefined,
    nodes: [],
    setNodes: nodes => set({ nodes: typeof nodes === 'function' ? nodes(get().nodes) : nodes, isSaved: false }),
    edges: [],
    setEdges: edges => set({ edges: typeof edges === 'function' ? edges(get().edges) : edges, isSaved: false }),
    rfInstance: undefined,
    setRfInstance: rfInstance => set({ rfInstance }),

    loadProductionLineFromIdb: id => {
      set({ loading: 'productionLine' });
      loadProductionLineFromIdb(id)
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
      console.log('onNodesChange', changes);
      const { nodes: eNodes, selNode } = get();
      const changedMap = new Map<string, Node>();
      const removeNodeIds = new Set<string>();

      for (const change of changes) {
        if (change.type === 'add') {
          changedMap.set(change.item.id, change.item);
        } else if (change.type === 'remove') {
          removeNodeIds.add(change.id);
        } else if (change.type === 'reset') {
          removeNodeIds.add(change.item.id);
          changedMap.set(change.item.id, change.item);
        } else {
          let node = changedMap.get(change.id);
          if (!node) {
            node = eNodes.find(n => n.id === change.id);
            if (node) {
              node = { ...node }; // Make a copy, the node will be mutated in the next step
              changedMap.set(node.id, node);
              removeNodeIds.add(node.id);
            } else {
              throw new Error(`Node with id ${change.id} not found`);
            }
          }

          if (change.type === 'position') {
            const { position, positionAbsolute, dragging } = change;
            if (position) {
              node.position = position;
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
      console.log({ changedMap, removeNodeIds });

      set({
        nodes: [...changedMap.values(), ...eNodes.filter(n => !removeNodeIds.has(n.id))],
        selNode: selNode && (changedMap.has(selNode?.id) ? changedMap.get(selNode.id) : selNode),
        isSaved: false,
      });
    },
    onEdgesChange: changes => {
      // const eEdges = get().edges;
      const { edges: eEdges, selEdge } = get();
      const changedMap = new Map<string, Edge>();
      const removeEdgeIds = new Set<string>();

      for (const change of changes) {
        if (change.type === 'add') {
          changedMap.set(change.item.id, change.item);
        } else if (change.type === 'remove') {
          removeEdgeIds.add(change.id);
        } else if (change.type === 'reset') {
          removeEdgeIds.add(change.item.id);
          changedMap.set(change.item.id, change.item);
        } else {
          let edge = changedMap.get(change.id);
          if (!edge) {
            edge = eEdges.find(e => e.id === change.id);
            if (edge) {
              edge = { ...edge }; // Make a copy, the edge will be mutated in the next step
              changedMap.set(edge.id, edge);
              removeEdgeIds.add(edge.id);
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
        edges: [...changedMap.values(), ...eEdges.filter(e => !removeEdgeIds.has(e.id))],
        selEdge: selEdge && (changedMap.has(selEdge?.id) ? changedMap.get(selEdge.id) : selEdge),
        isSaved: false,
      });
    },
    onConnect: conn => {
      const eEdges = get().edges;

      if (!conn.source || !conn.target) {
        return;
      }

      if (eEdges.some(e => (['source', 'target', 'sourceHandle', 'targetHandle'] as const).every(k => e[k] === conn[k]))) {
        return;
      }

      set({
        edges: [
          ...eEdges,
          {
            id: nanoid(),
            type: 'smoothstep',
            data: {},
            source: conn.source!,
            target: conn.target!,
            sourceHandle: conn.sourceHandle === null ? undefined : conn.sourceHandle,
            targetHandle: conn.targetHandle === null ? undefined : conn.targetHandle,
          },
        ],
        isSaved: false,
      });
    },
    onDrop: e => {
      e.preventDefault();
      const { nodes, rfInstance } = get();
      const type = e.dataTransfer.getData('application/reactflow') as NodeTypeKeys;
      if (!type || !rfInstance) {
        return;
      }
      const position = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      set({ nodes: [...nodes, { id: nanoid(), type, position, data: {} }] });
    },
    onSelectionChange: ({ nodes, edges }) => {
      const { selNode, selEdge } = get();
      if (nodes.length === 0 && selNode) {
        set({ selNode: undefined });
      }
      if (edges.length === 0 && selEdge) {
        set({ selEdge: undefined });
      }
      if (nodes.length === 1 && !selNode) {
        set({ selNode: nodes[0] });
      }
      if (edges.length === 1 && !selEdge) {
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
  const navigate = useLocation()[1];
  const storeRef = useRef<ProductionLineStore>();
  if (!storeRef.current) {
    storeRef.current = createApplicaionStore(navigate);
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
