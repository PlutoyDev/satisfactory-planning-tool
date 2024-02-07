// Main application state store using zustand
import { create, type StateCreator } from "zustand";
import { nanoid } from "nanoid";
import { addEdge, applyEdgeChanges, applyNodeChanges } from "reactflow";
import type { Node, Edge, OnConnect, OnNodesChange, OnEdgesChange, NodeChange, EdgeChange, Connection } from "reactflow";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import { unzlibSync, zlibSync } from "fflate";
import { produce } from "immer";
import { devtools, type DevtoolsOptions } from "zustand/middleware";

const devtoolsOptions: DevtoolsOptions = {
  enabled: !import.meta.env.PROD,
};

export interface ProdInfo {
  id: string;
  title: string;
  icon: string;
}

export interface Actions {
  updateInfo: (id: string, info: Partial<Omit<ProdInfo, "id">>) => void;

  createProdLine: () => string; //returns id for link replacement
  loadProdLine: (id: string) => Promise<void>;
  saveProdLine: () => Promise<void>;
  deleteProdLine: (id: string) => Promise<void>;
  deleteProdLineCancel: () => void;

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

export interface EditingState extends GlobalState, ProdLine {
  // Will be in editing state when in production-line route
  state: "editing";
  // Currently editing Production line
  info: ProdInfo;

  isSaving: boolean;
  isSaved: boolean;

  confirmingDelete: boolean;
  isDeleting: boolean;
}

export interface HomeState extends GlobalState {
  // Will be in home state when in home route
  state: "home";
}

export type State = EditingState | LoadingState | LoadingErrorState | HomeState;

function getStoredProdInfos(): ProdInfo[] {
  const json = localStorage.getItem("prods");
  if (!json) {
    return [];
  }
  const prods = JSON.parse(json) as ProdInfo[];
  if (!Array.isArray(prods)) {
    return [];
  }
  return prods;
}

function saveProdInfos(prods: ProdInfo[]) {
  localStorage.setItem("prods", JSON.stringify(prods));
}

const stateCreator: StateCreator<State> = (set, get) => ({
  state: "home" as const,
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
      title: "Unnamed Production Line",
      icon: "???",
    };
    const state = get();
    const prodInfos = [...state.prodInfos, newProdInfo];
    set({
      prodInfos,
      state: "editing",
      info: newProdInfo,
      nodes: [],
      edges: [],
      isSaving: false,
      isSaved: false,
      confirmingDelete: false,
      isDeleting: false,
    });
    saveProdInfos(prodInfos);
    state.saveProdLine();
    return newProdInfo.id;
  },
  loadProdLine: async (id: string) => {
    // Load from indexeddb, its stored with prefix 'prod-'
    set({ state: "loading" });
    try {
      const storeProdInfo = get().prodInfos;
      const prodInfo = storeProdInfo.find((prod) => prod.id === id);
      const prod = await idbGet(`prod-${id}`);
      if (!prod || !prodInfo) {
        // TODO: Show it in UI
        console.error("Unable to find production line", { id, infoMissing: !prodInfo, graphMissing: !prod });
        if (!prod && prodInfo) {
          const indexToDelete = storeProdInfo.findIndex((prod) => prod.id === id);
          set({
            prodInfos: storeProdInfo.toSpliced(indexToDelete, 1),
          });
        }
        set({ state: "loading-error" });
        return;
      }
      // Unzlib the data, and parse
      const data = JSON.parse(atob(new TextDecoder().decode(unzlibSync(prod)))) as ProdLine;
      set({
        state: "editing",
        info: prodInfo,
        ...data,
        isSaving: false,
        isSaved: true,
        confirmingDelete: false,
        isDeleting: false,
      });
    } catch (error) {
      // TODO: Show it in UI
      console.error("Error loading production line", { id }, error);
      set({ state: "loading-error" });
    }
  },
  saveProdLine: async () => {
    const store = get() as EditingState;
    set({ isSaving: true });
    const b64 = btoa(JSON.stringify({ nodes: store.nodes, edges: store.edges }));
    const compressed = zlibSync(new TextEncoder().encode(b64));
    await idbSet(`prod-${store.info.id}`, compressed);
  },
  closeProdline: async () => {
    const store = get() as EditingState;
    if (store.isSaved === false) {
      await store.saveProdLine();
    }
    set({ state: "home" });
  },
  deleteProdLine: async (id: string) => {
    // Can only delete in edit page
    const store = get() as EditingState;
    const indexToDelete = store.prodInfos.findIndex((prod) => prod.id === id);
    if (!indexToDelete) return;

    if (!store.confirmingDelete) {
      // default should be false
      set({ confirmingDelete: true, isDeleting: true });
    } else {
      set({ confirmingDelete: false });
      await idbDel(`prod-${id}`);
      set({
        prodInfos: store.prodInfos.toSpliced(indexToDelete, 1),
        isDeleting: false,
      });
    }
  },
  deleteProdLineCancel: () => {
    set({ confirmingDelete: false, isDeleting: false });
  },
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
});

export const useStore = create<State>()(devtools(stateCreator, devtoolsOptions));

export default useStore;
