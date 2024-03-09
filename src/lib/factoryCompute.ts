import type { Docs, Item, Recipe } from '../context/DocsContext';
import type { ItemNodeData, RecipeNodeData, LogisticNodeData } from '../components/FactoryGraph';
import StoredClockspeed from '../utils/clockspeed';

export const FactoryIODirOrder = ['left', 'top', 'right', 'bottom'] as const;
export type FactoryIODir = (typeof FactoryIODirOrder)[number];
type NoDirFactoryIO = `${'solid' | 'fluid'}:${'in' | 'out'}`;
type FactoryIO = `${FactoryIODir}:${NoDirFactoryIO}`;
export type FactoryIndexedIO = `${FactoryIO}:${0 | 1 | 2 | 3}`;

export function splitFactoryIO(id: FactoryIndexedIO): [FactoryIODir, 'solid' | 'fluid', 'in' | 'out', 0 | 1 | 2 | 3] {
  const [dir, form, io, indexStr] = id.split(':') as [FactoryIODir, 'solid' | 'fluid', 'in' | 'out', '0' | '1 ' | '2' | '3'];
  const index = parseInt(indexStr, 10) as 0 | 1 | 2 | 3;
  return [dir, form, io, index];
}

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
  connectedResult?: Partial<Record<FactoryIndexedIO, ItemSpeed[]>>;
}

interface ItemComputeResult extends ComputeResult {
  item: Item;
}

export function computeItemNode({ data, d }: ComputeArgs<ItemNodeData>): null | ItemComputeResult {
  const { itemId, speed = 0, io = 'both' } = data;

  if (!itemId) return null;
  const item = d.items[itemId];
  if (!item) return null;

  const form: 'solid' | 'fluid' = item.form === 'liquid' || item.form === 'gas' ? 'fluid' : 'solid';
  const factoryIO: FactoryIndexedIO[] = [];
  const itemSpeed: Partial<Record<FactoryIndexedIO, ItemSpeed[]>> = {};

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

  return { factoryIO, itemSpeed, item };
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

export function computeLogisticNode({ data, d, connectedResult }: ComputeArgs<LogisticNodeData>): ComputeResult {
  const { type, rules = { center: ['any'] }, pipeInOut = { left: 'in' } } = data;

  //Logistic Node are a bit more complex as the result is dependent on what is connected to it

  const inventory: Map<string, number> = new Map();
  const itemSpeed: Partial<Record<FactoryIndexedIO, ItemSpeed[]>> = {};
  const factoryIO: FactoryIndexedIO[] = [];
  const unusedIndex: number[] = [0, 1, 2, 3];

  // Sum all the input and output by itemId
  if (connectedResult) {
    for (const [key, value] of Object.entries(connectedResult)) {
      if (value) {
        for (const { itemId, speed } of value) {
          if (!inventory.has(itemId)) {
            inventory.set(itemId, 0);
          }
          const newSpeed = inventory.get(itemId)! + speed;
          if (newSpeed === 0) {
            inventory.delete(itemId);
          } else {
            inventory.set(itemId, newSpeed);
          }
        }
        // Provide the negative speed if there is a connection (for validation)
        itemSpeed[key as FactoryIndexedIO] = value.map(({ itemId, speed }) => ({ itemId, speed: -speed }));
        factoryIO.push(key as FactoryIndexedIO);
        unusedIndex.splice(unusedIndex.indexOf(Number(key.split(':')[3])), 1);
      }
    }
  }

  let remainingOutCount = 0;
  let remainingInCount = 0;

  if (type === 'pipeJunc') {
    // Pipe Junctions
    if (inventory.size > 1) {
      // Pipe Junctions can't have different fluid in the same pipe
      console.error("Pipe Junctions can't have different items in the same pipe", connectedResult);
      return { factoryIO };
    }

    for (const idx of unusedIndex) {
      const dir = FactoryIODirOrder[idx];
      if (pipeInOut[dir] === 'in') remainingInCount++;
      else remainingOutCount++;
    }
  } else {
    //Conveyor Splitter/Merger
    if (type === 'merger') {
      if (unusedIndex.includes(2) /* right = output */) remainingOutCount++;
      remainingInCount = unusedIndex.length - remainingOutCount;
    } else {
      if (unusedIndex.includes(0) /* left = input */) remainingInCount++;

      if (type == 'splitter') {
        remainingOutCount = unusedIndex.length - remainingInCount;
      } else {
        // for smart/pro splitter, count all "any" and "overflow" rules (so that the remaining can be "distributed")
        remainingOutCount = Object.values(rules).reduce((acc, cur) => (cur.some(r => ['any', 'overflow'].includes(r)) ? acc + 1 : acc), 0);
      }
    }
  }

  //  divide the remaining inventory by the number of remaining direction
  for (const idx of unusedIndex) {
    const dir = FactoryIODirOrder[idx];
    let form: 'solid' | 'fluid';
    let io: 'in' | 'out';
    if (type === 'pipeJunc') {
      form = 'fluid';
      io = pipeInOut[dir] ?? 'out';
    } else {
      form = 'solid';
      io = (type === 'merger' ? dir !== 'right' : dir === 'left') ? 'in' : 'out';
    }
    const id: FactoryIndexedIO = `${dir}:${form}:${io}:${idx as 0 | 1 | 2 | 3}`;
    factoryIO.push(id);
    itemSpeed[id] = [];
    if (inventory.size > 0) {
      for (const [itemId, speed] of inventory) {
        if (speed !== 0) {
          itemSpeed[id]!.push({ itemId, speed: -speed / (io === 'in' ? remainingInCount : remainingOutCount) });
        }
      }
    }
  }

  return { factoryIO, itemSpeed };
}
