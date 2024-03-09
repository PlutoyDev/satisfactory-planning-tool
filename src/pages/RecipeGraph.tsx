// Full recipe graph containing all default and alternates.
import ReactFlow, { useNodesState, useEdgesState, addEdge, Controls, MiniMap, Background } from '@xyflow/react';

interface DocsItem {
  key: string;
  displayName: string;
  description: string;
  abbreviatedDisplayName: string;
  stackSize: number;
  sinkPoints: number;
  energyValue: number;
  form: 'solid' | 'liquid' | 'gas' | null;
  productOf?: string[];
  ingredientOf?: string[];
  iconPath: string | null;
  smallIconBase64: string | null;
}

interface DocsRecipe {
  key: string;
  displayName: string;
  manufactoringDuration: number;
  ingredients?: { itemKey: string; amount: number }[];
  products: { itemKey: string; amount: number }[];
  producedIn: string;
}

interface Docs {
  items: DocsItem[];
  recipes: DocsRecipe[];
}

function fetchDocs() {
  return fetch('/simplified-docs.json').then(res => res.json()) as Promise<Docs>;
}

export function FullRecipeGraph() {}
