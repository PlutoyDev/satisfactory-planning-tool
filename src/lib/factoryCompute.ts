import type { Docs } from '../context/DocsContext';
import type { ItemNodeData, RecipeNodeData, LogisticNodeData } from '../components/FactoryGraph';

const FactoryIODirOrder = ['left', 'top', 'right', 'bottom'] as const;
type FactoryIODir = (typeof FactoryIODirOrder)[number];
type FactoryIO = `${FactoryIODir}:${'solid' | 'fluid'}:${'in' | 'out'}`;
type FactoryIndexedIO = `${FactoryIO}:${0 | 1 | 2 | 3}`;

interface ItemSpeed {
  itemId: string;
  speed: number;
}

interface ComputeResult {
  factoryIO: FactoryIndexedIO[];
  /** the speed of each item in each factoryIO */
  itemSpeed?: Partial<Record<FactoryIndexedIO, ItemSpeed[]>>;
  /** valid */
  valid?: Partial<Record<FactoryIndexedIO, boolean>>;
}

interface ComputeArgs<D> {
  data: D;
  d: Docs;
  /** the computed result of connected nodes, where the key is handleId read from edge data */
  connectedResult: Partial<Record<FactoryIndexedIO, ItemSpeed[]>>;
}

export function computeItemNode({ data, d, connectedResult }: ComputeArgs<ItemNodeData>): null | ComputeResult {
  const { itemId, speed = 0, io = 'both' } = data;

  if (!itemId) return null;
  const item = d.items[itemId];
  if (!item) return null;

  const form: 'solid' | 'fluid' = item.form === 'liquid' || item.form === 'gas' ? 'fluid' : 'solid';
  const factoryIO: FactoryIndexedIO[] = [];
  const itemSpeed: Partial<Record<FactoryIndexedIO, ItemSpeed[]>> = {};
  const valid: Partial<Record<FactoryIndexedIO, boolean>> = {};

  if (io === 'both' || io === 'in') {
    const id: FactoryIndexedIO = `left:${form}:in:0`;
    factoryIO.push(id);
    itemSpeed[id] = [{ itemId, speed }];
    valid[id] = connectedResult[id] ? connectedResult[id]!.some(x => x.itemId === itemId && x.speed === speed) : false;
  }

  if (io === 'both' || io === 'out') {
    const id: FactoryIndexedIO = `right:${form}:out:0`;
    factoryIO.push(id);
    itemSpeed[id] = [{ itemId, speed }];
    valid[id] = connectedResult[id] ? connectedResult[id]!.some(x => x.itemId === itemId && x.speed === speed) : false;
  }

  return { factoryIO, itemSpeed };
}
