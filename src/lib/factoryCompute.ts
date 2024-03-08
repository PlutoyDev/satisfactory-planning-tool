import type { Docs, Item, Recipe } from '../context/DocsContext';
import type { ItemNodeData, RecipeNodeData, LogisticNodeData } from '../components/FactoryGraph';
import StoredClockspeed from '../utils/clockspeed';

const FactoryIODirOrder = ['left', 'top', 'right', 'bottom'] as const;
type FactoryIODir = (typeof FactoryIODirOrder)[number];
type NoDirFactoryIO = `${'solid' | 'fluid'}:${'in' | 'out'}`;
type FactoryIO = `${FactoryIODir}:${NoDirFactoryIO}`;
type FactoryIndexedIO = `${FactoryIO}:${0 | 1 | 2 | 3}`;

interface ItemSpeed {
  itemId: string;
  /** number of item per minute */
  speed: number;
}

interface ComputeResult {
  factoryIO: FactoryIndexedIO[];
  /** the speed of each item in each factoryIO */
  itemSpeed?: Partial<Record<FactoryIndexedIO, ItemSpeed[]>>;
}

interface ComputeArgs<D> {
  data: D;
  d: Docs;
  /** the computed result of connected nodes, where the key is handleId read from edge data */
  connectedResult: Partial<Record<FactoryIndexedIO, ItemSpeed[]>>;
}

export function computeItemNode({ data, d }: ComputeArgs<ItemNodeData>): null | ComputeResult {
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
  }

  if (io === 'both' || io === 'out') {
    const id: FactoryIndexedIO = `right:${form}:out:0`;
    factoryIO.push(id);
    itemSpeed[id] = [{ itemId, speed }];
  }

  return { factoryIO, itemSpeed };
}

interface RecipeComputeResult extends ComputeResult {
  recipe: Recipe;
  items: Item[];
}

export function computeRecipeNode({ data, d }: ComputeArgs<RecipeNodeData>): null | RecipeComputeResult {
  const { recipeId, storedCs = StoredClockspeed.FromDecimal(1) } = data;

  if (!recipeId) return null;
  const recipe = d.recipes[recipeId];
  if (!recipe) return null;

  const factoryIO: FactoryIndexedIO[] = [];
  const itemSpeed: Partial<Record<FactoryIndexedIO, ItemSpeed[]>> = {};

  const { ingredients, products, producedIn, manufactoringDuration } = recipe;
  const items: Item[] = [];

  // The higher the clockspeed, the faster the factory runs, shortening the time it takes to produce items
  const clockspeed = StoredClockspeed.ToDecimal(storedCs);
  const duration = manufactoringDuration / clockspeed / 60; // minutes

  const totalLength = ingredients.length + products.length;
  const ioCount: Record<NoDirFactoryIO, 0 | 1 | 2 | 3> = { 'solid:in': 0, 'solid:out': 0, 'fluid:in': 0, 'fluid:out': 0 };

  for (let i = 0; i < totalLength; i++) {
    const { itemKey, amount } = i < ingredients.length ? ingredients[i] : products[i - ingredients.length];
    const item = d.items[itemKey];
    if (!item) return null;
    items.push(item);

    const form: 'solid' | 'fluid' = item.form === 'liquid' || item.form === 'gas' ? 'fluid' : 'solid';
    const io = i < ingredients.length ? 'in' : 'out';
    const noDirId: NoDirFactoryIO = `${form}:${io}`;
    const index = ioCount[noDirId]++ as 0 | 1 | 2 | 3;
    const id: FactoryIndexedIO = `${i < ingredients.length ? 'left' : 'right'}:${noDirId}:${index}`;
    factoryIO.push(id);
    // the shorter the duration, the faster the factory runs, requiring more items to be produced, and producing more items.
    itemSpeed[id] = [{ itemId: itemKey, speed: ((i < ingredients.length ? 1 : -1) * amount) / duration }];
  }

  return { factoryIO, itemSpeed, recipe, items };
}

export function computeLogisticNode({ data, d, connectedResult }: ComputeArgs<LogisticNodeData>): null | ComputeResult {
  const { type, rules, pipeInOut = { left: 'in' } } = data;

  //Logistic Node are a bit more complex as the result is dependent on what is connected to it

  const inventory: Map<string, number> = new Map();
  const itemSpeed: Partial<Record<FactoryIndexedIO, ItemSpeed[]>> = {};
  const factoryIO: FactoryIndexedIO[] = [];
  const usedIndex: number[] = [];

  // Sum all the input and output by itemId
  for (const [key, value] of Object.entries(connectedResult)) {
    if (value) {
      for (const { itemId, speed } of value) {
        if (!inventory.has(itemId)) {
          inventory.set(itemId, 0);
        }
        inventory.set(itemId, inventory.get(itemId)! + speed);
      }
      // Provide the negative speed if there is a connection (for validation)
      itemSpeed[key as FactoryIndexedIO] = value.map(({ itemId, speed }) => ({ itemId, speed: -speed }));
      factoryIO.push(key as FactoryIndexedIO);
      usedIndex.push(parseInt(key.split(':')[3]));
    }
  }

  let remainingOutCount: number;
  let remainingInCount: number;

  if (type === 'pipeJunc') {
    // Pipe Junctions
    if (inventory.size > 1) {
      // Pipe Junctions can't have different fluid in the same pipe
      console.error("Pipe Junctions can't have different items in the same pipe", connectedResult);
      return { factoryIO };
    }

    for (const [dir, io] of Object.entries(pipeInOut)) {
    }
  } else {
    //Conveyor Splitter/Merger
  }

  // Add the remaining direction, and divide the remaining inventory by the number of remaining direction
}
