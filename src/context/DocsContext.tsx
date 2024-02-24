import { ComponentType, createContext, useContext, useEffect, useMemo, useState } from 'react';
import useLegacyEffect from '../hooks/useLegacyEffect';

export interface Docs {
  items: Record<string, Item>;
  recipes: Record<string, Recipe>;
  productionMachines: Record<string, ProductionMachine>;
  generators: Record<string, Generator>;
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

const url = '/satisfactory/simplified-docs.json';

export interface DocsContextValue {
  loading: boolean;
  docs: Docs | undefined;
}

const DocsContext = createContext<DocsContextValue>({ loading: true, docs: undefined });

export interface DocsProviderProps {
  LoaderComponent?: React.ReactNode;
  children: React.ReactNode;
}

export function DocsProvider({ LoaderComponent, children }: DocsProviderProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Docs | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);

  useLegacyEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    throw error;
  }

  return (
    <DocsContext.Provider value={{ loading, docs: data }}>{loading && LoaderComponent ? LoaderComponent : children}</DocsContext.Provider>
  );
}

export function useDocs(): Docs;
export function useDocs<R>(selector: (docs: Docs) => R, deps?: React.DependencyList): R;

/**
 * Hook to get the docs from the context
 * @param selector selector function that takes the docs and returns the value you want
 * @param dependencies dependencies for the selector function
 * @returns
 */
export function useDocs<R>(selector?: (docs: Docs) => R, deps?: React.DependencyList) {
  const { docs, loading } = useContext(DocsContext);

  if (loading) {
    throw new Promise(resolve => setTimeout(resolve, 100));
  }

  return selector ? useMemo(() => selector(docs!), deps ?? []) : docs!;
}
