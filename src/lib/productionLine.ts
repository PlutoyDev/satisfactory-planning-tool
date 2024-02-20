import type { Node, Edge, Viewport } from 'reactflow';
import pick from 'lodash/pick';

export interface ProductionLineInfo {
  id: string;
  title: string;
  icon: string;
}

export type SavedNode = Pick<Node, 'id' | 'type' | 'data' | 'position'>;
export type SavedEdge = Pick<Edge, 'id' | 'type' | 'data' | 'source' | 'target' | 'sourceHandle' | 'targetHandle'>;

export interface SavedProductionLine {
  info: ProductionLineInfo;
  nodes: SavedNode[];
  edges: SavedEdge[];
  viewport?: Viewport;
}

export const convertToSavedNode = (node: Node): SavedNode => pick(node, 'id', 'type', 'data', 'position');
export const convertToSavedEdge = (edge: Edge): SavedEdge =>
  pick(edge, 'id', 'type', 'data', 'source', 'target', 'sourceHandle', 'targetHandle');

export const ensureSavedNode = (node: Node | SavedNode): SavedNode =>
  Object.keys(node).length === 4 ? (node as SavedNode) : convertToSavedNode(node as Node);
export const ensureSavedEdge = (edge: Edge | SavedEdge): SavedEdge =>
  Object.keys(edge).length === 7 ? (edge as SavedEdge) : convertToSavedEdge(edge as Edge);
