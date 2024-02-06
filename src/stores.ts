// Main application state store using zustand
import { create } from "zustand";
import { nanoid } from "nanoid";
import { addEdge, applyEdgeChanges, applyNodeChanges } from "reactflow";
import type { Node, Edge, OnConnect, OnNodesChange, OnEdgesChange, NodeChange, EdgeChange, Connection } from "reactflow";
import { get as idbGet, set as idbSet } from "idb-keyval";
import { unzlibSync, zlibSync } from "fflate";
import { produce } from "immer";

export interface ProdInfo {
  id: string;
  title: string;
  icon: string;
}

export interface Actions {
  updateInfo: (id: string, info: Partial<Omit<ProdInfo, "id">>) => void;

  createProdLine: () => void;
  loadProdLine: (id: string) => void;
  saveProdLine: () => void;
  deleteProdLine: (id: string) => void;

  // Callbacks for graph changes
  onConnect: OnConnect;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
}

export interface GlobalState extends Actions {
  // Will be in global state when in any route
  state: string;
  prodInfos: ProdInfo[];
}

export interface ProdLine {
  // Production line graph's nodes and edges
  nodes: Node[];
  edges: Edge[];
}

export interface LoadingState extends GlobalState {
  // Will be in loading state when in production-line route
  state: "loading";
}

export interface LoadingErrorState extends GlobalState {
  state: "loading-error";
}

export interface EditingState extends GlobalState, ProdInfo, ProdLine {
  // Will be in editing state when in production-line route
  state: "editing";
  // Currently editing Production line
  prodId: string;
  title: string;
  icon: string;

  isSaving: boolean;
  isSaved: boolean;
}

export interface HomeState extends GlobalState {
  // Will be in home state when in home route
  state: "home";
}

export type State = EditingState | LoadingState | LoadingErrorState | HomeState;

function getStoredProdInfos(): ProdInfo[] {
  const prods = localStorage.getItem("prods");
  if (!prods || !Array.isArray(prods)) {
    return [];
  }
  return prods;
}

function saveProdInfos(prods: ProdInfo[]) {
  localStorage.setItem("prods", JSON.stringify(prods));
}

export const useStore = create<State>((set, get) => ({
  state: "home",
  prodInfos: getStoredProdInfos(),
  updateInfo: (id, info) => {
    const index = get().prodInfos.findIndex((prod) => prod.id === id);
    if (index === -1) return;
    set(
      produce((state) => {
        state.prodInfos[index] = { ...state.prodInfos[index], ...info };
        saveProdInfos(state.prodInfos);
      }),
    );
  },
  createProdLine: () => {
    const newProdInfo: ProdInfo = {
      id: nanoid(),
      title: "New Production Line",
      icon: "???",
    };
    set({
      state: "editing",
      prodId: newProdInfo.id,
      title: newProdInfo.title,
      icon: newProdInfo.icon,
      nodes: [],
      edges: [],
      isSaving: false,
      isSaved: false,
      prodInfos: [...get().prodInfos, newProdInfo],
    });
  },
  loadProdLine: async (id: string) => {
    // Load from indexeddb, its stored with prefix 'prod-'
    set({ state: "loading" });
    console.log("Loading Production Line Data", { id });
    try {
      const prodInfo = get().prodInfos.find((prod) => prod.id === id);
      const prod = await idbGet(`prod-${id}`);
      if (!prod || !prodInfo) {
        return;
      }
      // Unzlib the data, and parse
      const data = JSON.parse(atob(new TextDecoder().decode(unzlibSync(prod)))) as ProdLine;
      set({
        state: "editing",
        ...prodInfo,
        ...data,
        isSaving: false,
        isSaved: true,
      });
    } catch (error) {
      console.error("Error loading production line", { id }, error);
      set({ state: "loading-error" });
    }
  },
  saveProdLine: async () => {
    const store = get() as EditingState;
    set({ isSaving: true });
    const b64 = btoa(JSON.stringify({ nodes: store.nodes, edges: store.edges }));
    const compressed = zlibSync(new TextEncoder().encode(b64));
    await idbSet(`prod-${store.prodId}`, compressed);
  },
  deleteProdLine: async (id: string) => {},
  onNodesChange: (changes: NodeChange[]) => {
    const store = get() as EditingState;
    set({
      nodes: applyNodeChanges(changes, store.nodes),
      isSaved: false,
    });
  },
  onEdgesChange: (changes: EdgeChange[]) => {
    const store = get() as EditingState;
    set({
      edges: applyEdgeChanges(changes, store.edges),
      isSaved: false,
    });
  },
  onConnect: (connection: Connection) => {
    const store = get() as EditingState;
    set({
      edges: addEdge(connection, store.edges),
      isSaved: false,
    });
  },
}));

export default useStore;
