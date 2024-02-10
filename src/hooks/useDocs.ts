// Docs.json context provider with react canary use context.
import { createContext, use, useCallback, useMemo } from 'react';

interface Docs {
  items: Record<string, Item>;
  recipes: Record<string, Recipe>;
  productionMachines: Record<string, ProductionMachine>;
  generators: Record<string, Generator>;
  resources: Record<string, Resource>;
  // TODO: Add schematics
  // schematics: Schematic[]
}

export interface Item {
  key: string;
  displayName: string;
  description: string;
  abbreviatedDisplayName: string;
  stackSize: number;
  sinkPoints: number;
  energyValue: number;
  form: 'solid' | 'liquid' | 'gas' | null;
  /** Array of recipe id that produces it */
  productOf?: string[];
  /** Array of recipe id that uses it */
  ingredientOf?: string[];
  iconPath: string | null;
}

export type Resource = Item;

export interface Recipe {
  key: string;
  displayName: string;
  manufactoringDuration: number;
  ingredients?: { itemKey: string; amount: number }[];
  products: { itemKey: string; amount: number }[];
  producedIn: string;
}

export interface ProductionMachine {
  key: string;
  displayName: string;
  powerConsumption: number;
  ingredients: { itemKey: string; amount: number }[];
}

export interface Generator {
  key: string;
  displayName: string;
  description: string;
  powerProduction: number;
  fuel: {
    fuelClass: string;
    supplementalResourceClass: string;
    byproductClass?: string;
    byproductAmount?: number;
  }[];
}

const docsPromise = fetch('/satisfactory/simplified-docs.json').then(res => res.json()) as Promise<Docs>;
// const useDocs = async <T>(selector: (docs: Docs) => T) => selector(await docsPromise);

/**
 * Use the docs content that has been fetched when the app is loaded.
 * @param selector selector function that takes the docs and returns the value you want
 * @param dependencies dependencies for the selector function
 * @returns the awaited value from the selector function, need to be used with suspense
 */
function useDocs<T>(selector: (docs: Docs) => T, dependencies: unknown[] = []) {
  return use(useMemo(() => docsPromise.then(selector), dependencies));
}

export default useDocs;
