// Reactflow custom nodes
import { useRef, useEffect, type ComponentType, useMemo, useState, useCallback } from 'react';
import type { NodeProps, Node } from 'reactflow';
import { Handle, Position, useUpdateNodeInternals } from 'reactflow';
import { useDocs } from '../context/DocsContext';
import { getFocusedColor } from '../lib/colorUtils';
import Fuse from 'fuse.js';

export interface NodeDataEditorProps<D extends Record<string, any>, T extends string | undefined = undefined> {
  node: Node<D, T>;
  updateNode: (update: Partial<Node<Partial<D>, T>>) => void;
}

export interface BaseNodeData {
  rotation?: number;
  bgColor?: string;
}

const FactoryIODirOrder = ['top', 'right', 'bottom', 'left'] as const;
type FactoryIODir = (typeof FactoryIODirOrder)[number];
type FactoryIO = `${FactoryIODir}:${'solid' | 'fluid'}:${'in' | 'out'}`;

export interface BaseNodeProps extends NodeProps<BaseNodeData> {
  children: React.ReactNode;
  backgroundColor: string;
  factoryIO: FactoryIO[];
}

function BaseNode({ children, backgroundColor, factoryIO, id, data, selected }: BaseNodeProps) {
  const { rotation = 0, bgColor = backgroundColor } = data;
  const updateNodeInternals = useUpdateNodeInternals();
  const topArgs = useMemo(() => {
    const count: Partial<Record<FactoryIODir, number>> = {};
    const indexs: number[] = [];
    factoryIO.forEach((io, i) => {
      const dir = io.split(':')[0] as FactoryIODir;
      count[dir] = (count[dir] ?? 0) + 1;
      indexs.push(count[dir]!);
    });
    return { count, indexs };
  }, [factoryIO, id, updateNodeInternals]);

  useEffect(() => {
    updateNodeInternals(id);
  }, [factoryIO, rotation, updateNodeInternals]);

  return (
    <>
      <div
        className='rounded-md px-4 py-1 text-primary-content outline-offset-2'
        style={{
          backgroundColor: bgColor,
          outline: selected ? '2px solid ' + bgColor : 'none',
        }}
      >
        <div>{children}</div>
      </div>
      {factoryIO.map((io, i) => {
        const [dir, type, inOut] = io.split(':') as ['top' | 'right' | 'bottom' | 'left', 'solid' | 'fluid', 'in' | 'out'];
        const tDir = FactoryIODirOrder[(FactoryIODirOrder.indexOf(dir) + Math.floor(rotation / 90)) % 4];
        const offset = (topArgs.indexs[i] / (topArgs.count[dir]! + 1)) * 100;
        return (
          <Handle
            id={i.toString()}
            key={i}
            type={inOut === 'in' ? 'target' : 'source'}
            position={tDir as Position}
            style={{
              backgroundColor: inOut === 'in' ? '#F6E05E' : '#68D391',
              [tDir === 'top' || tDir === 'bottom' ? 'left' : 'top']: `${offset}%`,
              borderRadius: type === 'fluid' ? undefined : '0',
            }}
          />
        );
      })}
    </>
  );
}

function BaseNodeEditor<T extends string>(props: NodeDataEditorProps<BaseNodeData, T>) {
  const { node, updateNode } = props;
  const updateData = useCallback((d: Partial<BaseNodeData>) => updateNode({ ...node, data: { ...node.data, ...d } }), [updateNode]);

  return (
    <>
      <label htmlFor='rotation' className='flex-no-wrap form-control flex w-full flex-row items-center justify-around gap-x-1 pr-4 '>
        <div className='label flex-1'>
          <span className='label-text'>Rotation: </span>
        </div>
        <button
          type='button'
          className='btn btn-square btn-xs rounded-sm'
          onClick={() => updateData({ rotation: ((node.data.rotation ?? 0) - 90) % 360 })}
        >
          ↶
        </button>

        <button
          type='button'
          className='btn btn-square btn-xs rounded-sm'
          onClick={() => updateData({ rotation: ((node.data.rotation ?? 0) + 90) % 360 })}
        >
          ↷
        </button>
      </label>

      <label htmlFor='bgColor' className='form-control flex w-full flex-row items-center justify-around gap-x-1 pr-4'>
        <div className='label flex-1'>
          <span className='label-text'>Background Color: </span>
        </div>
        <input
          id='speed'
          type='color'
          className='input input-sm max-h-6'
          // @ts-expect-error
          value={node.data.bgColor ?? defaultNodeColor[node.type]}
          onChange={e => updateData({ ...node.data, bgColor: e.target.value })}
        />

        <button type='button' className='btn btn-square btn-xs rounded-sm' onClick={() => updateData({ ...node.data, bgColor: undefined })}>
          ❌
        </button>
      </label>
    </>
  );
}

export interface ItemNodeData extends BaseNodeData {
  /** Item id */
  itemId?: string;
  /** Production speed in item per minute */
  speed?: number;
}

export function ItemNode(props: NodeProps<ItemNodeData>) {
  const { itemId, speed } = props.data;
  const itemInfo = useDocs(
    ({ items }) => {
      if (!itemId) return null;
      const item = items[itemId];
      return {
        imgSrc: item?.iconPath ?? null,
        itemName: item?.displayName ?? 'Unknown',
        form: item.form === 'liquid' || item.form === 'gas' ? 'fluid' : ('solid' as 'solid' | 'fluid'),
      };
    },
    [itemId],
  );

  return (
    <BaseNode
      {...props}
      factoryIO={itemInfo?.form ? [`left:${itemInfo.form}:in`, `right:${itemInfo.form}:out`] : []}
      backgroundColor={defaultNodeColor.item}
    >
      <div className='flex min-h-24 flex-col items-center justify-center'>
        {itemInfo ? (
          <>
            {itemInfo.imgSrc && <img src={itemInfo.imgSrc} alt={itemInfo.itemName} className='h-6 w-6' />}
            <p className='text-center font-semibold'>{itemInfo.itemName}</p>
            <p className='text-center'>{speed} / min</p>
          </>
        ) : (
          <p className='text-center font-semibold'>Unset</p>
        )}
      </div>
    </BaseNode>
  );
}

export function ItemNodeDataEditor(props: NodeDataEditorProps<ItemNodeData, 'item'>) {
  const dropdownRef = useRef<HTMLDetailsElement>(null);
  const itemInfos = useDocs(d => d.items);
  const [search, setSearch] = useState('');
  const itemFuse = useMemo(() => new Fuse(Object.values(itemInfos), { keys: ['displayName'] }), [itemInfos]);
  const filtered = useMemo(
    () => (search ? itemFuse.search(search).map(({ item }) => item) : Object.values(itemInfos)),
    [itemInfos, search, itemFuse],
  );
  const { node, updateNode } = props;
  const selInfo = node.data.itemId && itemInfos[node.data.itemId];

  return (
    <>
      <label htmlFor='itemId' className='form-control w-full'>
        <div className='label'>
          <span className='label-text'>Item: </span>
        </div>
        <details ref={dropdownRef} className='dropdown dropdown-top w-full'>
          <summary className='btn btn-sm btn-block'>
            {selInfo ? (
              <>
                {selInfo.iconPath && <img src={selInfo.iconPath} alt={selInfo.displayName} className='h-6 w-6' />}
                {selInfo.displayName}
              </>
            ) : (
              'Unset'
            )}
          </summary>
          <div className='dropdown-content right-0 z-10 w-72 rounded-box bg-base-200 p-2 shadow-sm'>
            <input
              type='text'
              className='input input-sm input-bordered mb-1 w-full'
              placeholder='Search...'
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <ul className='clean-scrollbar menu menu-horizontal menu-sm h-48 w-full overflow-y-scroll'>
              {filtered.map(({ key, iconPath, displayName }) => (
                <li className='w-full' key={key}>
                  <button
                    className='btn btn-sm btn-block items-start justify-start'
                    type='button'
                    onClick={e => {
                      updateNode({ ...node, data: { ...node.data, itemId: key } });
                      dropdownRef.current?.removeAttribute('open');
                    }}
                  >
                    {iconPath && <img src={iconPath} alt={displayName} className='h-6 w-6' />}
                    {displayName}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </details>
      </label>
      <label htmlFor='speed' className='form-control w-full'>
        <div className='label'>
          <span className='label-text'>Speed: </span>
        </div>
        <input
          id='speed'
          type='number'
          className='input input-sm input-bordered appearance-none'
          defaultValue={node.data.speed}
          onChange={e => +e.target.value && updateNode({ ...node, data: { ...node.data, speed: +e.target.value } })}
        />
      </label>
      <BaseNodeEditor {...props} />
    </>
  );
}

export interface RecipeNodeData extends BaseNodeData {
  recipeId?: string;
  /**
   * Clockspeeds in  thousandth of a percent
   *
   * clockspeed = (thouCs / 100000)%*/
  thouCs?: number;
}

export function RecipeNode(props: NodeProps<RecipeNodeData>) {
  const { data, selected } = props;
  const { items, recipes, productionMachines } = useDocs();
  const { recipeId, thouCs = 10000000 } = data;
  const res = useMemo(() => {
    if (!recipeId) return null;
    const recipeInfo = recipes[recipeId];
    const machineInfo = productionMachines[recipeInfo.producedIn];
    const factoryIO: FactoryIO[] = [];
    const ingredientInfos = recipeInfo.ingredients?.map(({ itemKey }) => {
      const item = items[itemKey] ?? { displayName: 'Unknown' };
      const form: 'solid' | 'fluid' = item.form === 'liquid' || item.form === 'gas' ? 'fluid' : 'solid';
      factoryIO.push(`left:${form}:in`);
      return item;
    });
    const productInfos = recipeInfo.products?.map(({ itemKey }) => {
      const item = items[itemKey] ?? { displayName: 'Unknown' };
      const form: 'solid' | 'fluid' = item.form === 'liquid' || item.form === 'gas' ? 'fluid' : 'solid';
      factoryIO.push(`right:${form}:out`);
      return item;
    });

    return { factoryIO, recipeInfo, machineInfo, ingredientInfos, productInfos };
  }, [recipeId]);

  if (!res)
    return (
      <div
        className='rounded-md px-4 py-1 text-primary-content outline-offset-2'
        style={{
          backgroundColor: (selected ? defaultNodeFocusedColor : defaultNodeColor).recipe,
          outline: selected ? '2px solid ' + defaultNodeColor.recipe : 'none',
        }}
      >
        <p className='text-center font-semibold'>Unset</p>
      </div>
    );

  const { factoryIO, recipeInfo, machineInfo, ingredientInfos, productInfos } = res;

  return (
    <BaseNode {...props} backgroundColor={defaultNodeColor.recipe} factoryIO={factoryIO}>
      <div className='flex min-h-24 max-w-48 flex-col items-center justify-center'>
        {recipeInfo ? (
          <>
            <p className='text-pretty text-center font-semibold'>{recipeInfo.displayName}</p>
            <div className='flex flex-nowrap gap-x-0.5'>
              {ingredientInfos?.map(
                ({ iconPath, displayName }) => iconPath && <img src={iconPath} alt={displayName} className='h-6 w-6' />,
              )}
              →{productInfos?.map(({ iconPath, displayName }) => iconPath && <img src={iconPath} alt={displayName} className='h-6 w-6' />)}
            </div>
          </>
        ) : (
          <p className='text-center font-semibold'>Unset</p>
        )}
        {machineInfo ? (
          <p className='text-center'>
            {Math.floor(thouCs / 10) / 10000}% {machineInfo.displayName}
          </p>
        ) : (
          <p className='text-center font-semibold'>Unset</p>
        )}
      </div>
    </BaseNode>
  );
}

export function RecipeNodeDataEditor(props: NodeDataEditorProps<RecipeNodeData, 'recipe'>) {
  const { recipes, productionMachines, items } = useDocs();
  const { node, updateNode } = props;
  const recipeInfo = node.data.recipeId && recipes[node.data.recipeId];

  const recipeDropdownRef = useRef<HTMLDetailsElement>(null);
  const [machineFilter, setMachineFiter] = useState<string | undefined>(undefined);
  const recipeFuse = useMemo(() => new Fuse(Object.values(recipes), { keys: ['displayName'] }), [recipes]);
  const [search, setSearch] = useState('');
  const filteredRecipes = useMemo(
    () =>
      (search ? recipeFuse.search(search).map(({ item }) => item) : Object.values(recipes)).filter(
        ({ producedIn }) => !machineFilter || producedIn === machineFilter,
      ),
    [recipes, search, machineFilter ?? ''],
  );
  const getAnyIcon = useCallback(
    (key: string) => {
      if (items[key]?.iconPath) return <img src={items[key].iconPath!} alt={items[key].displayName} className='h-6 w-6' />;
      return null;
    },
    [items],
  );

  return (
    <>
      <label htmlFor='recipeId' className='form-control w-full'>
        <div className='label'>
          <span className='label-text'>Recipe: </span>
        </div>
        <details ref={recipeDropdownRef} className='dropdown dropdown-top w-full'>
          <summary className='btn btn-sm btn-block'>{recipeInfo ? recipeInfo.displayName : 'Unset'}</summary>
          <div className='dropdown-content right-0 z-10 w-96 rounded-box bg-base-200 p-2 shadow-sm'>
            <input
              type='text'
              className='input input-sm input-bordered mb-1 w-full'
              placeholder='Search...'
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {/* Machine Filter radio button group */}
            <div className='mb-1 flex flex-wrap'>
              <div className='form-control' key='all'>
                <label className='label cursor-pointer'>
                  <input
                    type='radio'
                    className='radio radio-xs'
                    name='machineFilter'
                    value={undefined}
                    checked={machineFilter === undefined}
                    onChange={e => setMachineFiter(undefined)}
                  />
                  <span className='label-text ml-2 text-sm'>All</span>
                </label>
              </div>
              {Object.values(productionMachines).map(({ key, displayName }) => (
                <div className='form-control' key={key}>
                  <label className='label cursor-pointer'>
                    <input
                      type='radio'
                      className='radio radio-xs'
                      name='machineFilter'
                      value={key}
                      checked={machineFilter === key}
                      onChange={e => setMachineFiter(e.target.value)}
                    />
                    <span className='label-text ml-2 text-sm'>{displayName}</span>
                  </label>
                </div>
              ))}
            </div>
            <ul className='clean-scrollbar menu menu-horizontal menu-sm max-h-48 max-w-full overflow-y-scroll !p-0'>
              {filteredRecipes.map(({ key, displayName, ingredients, products }) => (
                <li className='w-full' key={key}>
                  <button
                    className='btn btn-block min-h-max grid-cols-[1fr_auto] grid-rows-[auto] place-content-center'
                    type='button'
                    onClick={e => {
                      updateNode({ ...node, data: { ...node.data, recipeId: key } });
                      recipeDropdownRef.current?.removeAttribute('open');
                    }}
                  >
                    <span className='max-w-48 text-pretty'>{displayName}</span>
                    <div className='flex flex-nowrap gap-x-0.5'>
                      {ingredients?.map(({ itemKey }) => (<>{getAnyIcon(itemKey)}</>) as any)}→
                      {products?.map(({ itemKey }) => (<>{getAnyIcon(itemKey)}</>) as any)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </details>
      </label>
      <label htmlFor='clockspeeds' className='form-control w-full'>
        <div className='label'>
          <span className='label-text'>Clockspeeds: </span>
        </div>
        <input
          id='clockspeeds'
          type='number'
          step='0.01'
          className='input input-sm input-bordered appearance-none'
          defaultValue={node.data.thouCs ? Math.floor(node.data.thouCs / 10) / 10000 : 100}
          onChange={e => updateNode({ ...node, data: { ...node.data, thouCs: Math.floor(+e.target.value * 10000) * 10 } })}
        />
      </label>
      <BaseNodeEditor {...props} />
    </>
  );
}

export interface LogisticNodeData extends BaseNodeData {
  type?: 'splitter' | 'splitterSmart' | 'splitterProg' | 'merger';
  rules?: Record<'left' | 'center' | 'right', 'any' | 'none' | 'anyUndefined' | 'overflow' | `item: ${string}` | `resource: ${string}`>;
}

const logisticNames = {
  splitter: 'Splitter',
  splitterSmart: 'Smart Splitter',
  splitterProg: 'Programmable Splitter',
  merger: 'Merger',
} as const;

export function LogisticNode(props: NodeProps<LogisticNodeData>) {
  const { type = 'splitter', rules } = props.data;
  const isSplitter = type.startsWith('splitter');

  const factoryIO = useMemo(() => {
    if (isSplitter) return ['left:solid:in', 'top:solid:out', 'right:solid:out', 'bottom:solid:out'] as FactoryIO[];
    return ['top:solid:in', 'left:solid:in', 'bottom:solid:in', 'right:solid:out'] as FactoryIO[];
  }, [isSplitter]);

  return (
    <BaseNode {...props} factoryIO={factoryIO} backgroundColor={defaultNodeColor.logistic}>
      <div className='flex min-h-24 max-w-48 flex-col items-center justify-center'>
        <p className='text-center font-semibold'>{logisticNames[type]}</p>
      </div>
    </BaseNode>
  );
}

export function LogisticNodeDataEditor(props: NodeDataEditorProps<LogisticNodeData, 'logistic'>) {
  const { node, updateNode } = props;
  const { type = 'splitter', rules } = node.data;

  return (
    <>
      <label htmlFor='type' className='form-control w-full'>
        <div className='label'>
          <span className='label-text'>Type: </span>
        </div>
        <select
          id='type'
          className='select select-bordered select-sm w-full'
          value={type}
          onChange={e => updateNode({ ...node, data: { ...node.data, type: e.target.value as LogisticNodeData['type'] } })}
        >
          <option value='splitter'>Splitter</option>
          <option value='splitterSmart'>Smart Splitter</option>
          <option value='splitterProg'>Programmable Splitter</option>
          <option value='merger'>Merger</option>
        </select>
      </label>
      <BaseNodeEditor {...props} />
    </>
  );
}

// Used by ReactFlow to render custom nodes
export const nodeTypes = {
  item: ItemNode,
  recipe: RecipeNode,
  logistic: LogisticNode,
} as const;

export type NodeTypeKeys = keyof typeof nodeTypes;
export const nodeTypeKeys = Object.keys(nodeTypes) as NodeTypeKeys[];

export const defaultNodeColor = {
  item: '#76BABF',
  recipe: '#F6AD55',
  logistic: '#71DA8F',
} satisfies Record<NodeTypeKeys, string>;

export const defaultNodeFocusedColor = Object.fromEntries(
  Object.entries(defaultNodeColor).map(([k, v]) => [k, getFocusedColor(v)]),
) as Record<NodeTypeKeys, string>;

export const nodeEditors = {
  item: ItemNodeDataEditor,
  recipe: RecipeNodeDataEditor,
  logistic: LogisticNodeDataEditor,
} as const satisfies Record<NodeTypeKeys, ComponentType<NodeDataEditorProps<any, any>>>;

type CustomNodeDataMap = {
  [K in NodeTypeKeys]: (typeof nodeTypes)[K] extends ComponentType<NodeProps<infer D>> ? D : never;
};

type CustomNodePropertiesMap = {
  [K in NodeTypeKeys]: Node<CustomNodeDataMap[K], K>;
};

export type FactoryNodeData = CustomNodeDataMap[NodeTypeKeys];
export type FactoryNodeProperties = CustomNodePropertiesMap[NodeTypeKeys];
