import { create } from "zustand";
import { type ProductionLineSlice, createProductionLineSlice } from "./ProductionLine";

type Slices = ProductionLineSlice;

// Not Apple App Store tho 😂
export const useAppStore = create<Slices>()((...a) => ({
  ...createProductionLineSlice(...a),
}));

export default useAppStore;
