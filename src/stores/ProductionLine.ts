// Handle data loading and saving into the local storage.
// Each production line is searialized into a JSON string (or other format) and deflated with fflate library to save space.
// Each production line auto contains a meta-data like id, title, icon and description that is part of a array (that is not compressed) and is used quickly display the navigation menu.
// The types of production lines will be implemented at a later date.
// For now just meta-data is saved.

import { nanoid } from "nanoid";
import type { StateCreator } from "zustand";

export const generateProductionLineId = () => nanoid(8);

interface ProductionLineMetaData {
  id: string;
  title: string;
  icon: string;
  /** Description */
  desc: string;
  /** Last modified date (in millis) */
  modi: number;
}

// Meta data is as Map in runtime, but is seriallized into a array for storage.

export function getProdctionLineMetaDatas(): ProductionLineMetaData[] {
  const metaDatas = localStorage.getItem("productionLineMetaDatas");
  if (metaDatas === null) return [];
  const parsedData = JSON.parse(metaDatas);
  if (!Array.isArray(parsedData)) return [];
  return parsedData;
}

export function setProductionLineMetaDatas(metaDatas: ProductionLineMetaData[]) {
  localStorage.setItem("productionLineMetaDatas", JSON.stringify(metaDatas));
}

// Create the store
const initialState = {
  plMeta: getProdctionLineMetaDatas(),
  confirmingDelete: false,
};

interface Actions {
  createMeta: (data: ProductionLineMetaData) => void;
  editMeta: (id: string, data: Partial<ProductionLineMetaData>) => void;
  setConfirmingDelete: (value: boolean) => void;
  delete: (id: string) => void;
}

export type ProductionLineSlice = typeof initialState & Actions;

export const createProductionLineSlice: StateCreator<ProductionLineSlice> = (set) => ({
  ...initialState,
  createMeta: (data: ProductionLineMetaData) => {
    const newMetaDatas = [...getProdctionLineMetaDatas(), data];
    setProductionLineMetaDatas(newMetaDatas);
    set({ plMeta: newMetaDatas });
  },
  editMeta: (id: string, data: Partial<ProductionLineMetaData>) => {
    const newMetaDatas = getProdctionLineMetaDatas().map((metaData) => (metaData.id === id ? { ...metaData, ...data } : metaData));
    setProductionLineMetaDatas(newMetaDatas);
    set({ plMeta: newMetaDatas });
  },
  setConfirmingDelete: (value: boolean) => set({ confirmingDelete: value }),
  delete: (id: string) => {
    const newMetaDatas = getProdctionLineMetaDatas().filter((metaData) => metaData.id !== id);
    setProductionLineMetaDatas(newMetaDatas);
    set({ plMeta: newMetaDatas });
  },
});
