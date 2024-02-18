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

  /** Production Line Infos: for the production line list */
  productionLineInfos: ProductionLineInfo[];
  /** Set the production line infos */
  setProductionLineInfos: (infos: ProductionLineInfo[]) => void;
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
      saveProductionLineInfosToIdb(infos);
      set({ productionLineInfos: infos });
    },
    loadProductionLineInfosFromIdb: () => {
      set({ loading: 'infos' });
      loadProductionLineInfosFromIdb()
        .then(infos => set({ productionLineInfos: infos, loading: false }))
        .catch(error => set({ error }));
    },
    createProductionLine: () => {
      const id = nanoid();
      const infos = get().productionLineInfos;
      const newInfo: ProductionLineInfo = { id, title: 'Untitled', icon: '???' };
      const newInfos = [...infos, newInfo];
      set({ productionLineInfos: newInfos });
      navigate(`/production-line/${id}`);
    },

    selInfo: undefined,
    nodes: [],
    edges: [],
    setRfInstance: rfInstance => set({ rfInstance }),
    loadProductionLineFromIdb: id => {
      set({ loading: 'productionLine' });
      loadProductionLineFromIdb(id)
        .then(({ info, nodes, edges }) => set({ selInfo: info, nodes, edges, loading: false }))
        .catch(error => set({ error }));
    },
    saveFullProductionLineToIdb: () => {
      set({ saving: 'productionLine' });
      const { selInfo, nodes, edges, rfInstance } = get();
      const viewport = rfInstance?.getViewport();
      saveFullProductionLineToIdb(selInfo!, nodes, edges, viewport)
        .then(() => set({ saving: false }))
        .catch(error => set({ error }));
    },
    onNodesChange: changes => {
      const eNodes = get().nodes;
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
              changedMap.set(node.id, { ...node }); // Make a copy, the node will be mutated in the next step
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

      set({ nodes: [...changedMap.values(), ...eNodes.filter(n => !removeNodeIds.has(n.id))] });
    },
    onEdgesChange: changes => {
      const eEdges = get().edges;
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
              changedMap.set(edge.id, { ...edge }); // Make a copy, the edge will be mutated in the next step
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

      set({ edges: [...changedMap.values(), ...eEdges.filter(e => !removeEdgeIds.has(e.id))] });
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

export function useProductionLineStore(selector?: (state: AppState) => any) {
  const store = useContext(ProductionLineStoreContext);
  if (!store) {
    throw new Error('useProductionLine must be used within a ProductionLineProvider');
  }
  if (!selector) {
    return useStore(store);
  } else {
    return useStore(store, selector);
  }
}
