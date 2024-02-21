// Reactflow custom nodes
import { useRef, useEffect, type ComponentType, useMemo, useState, useCallback } from 'react';
import type { NodeProps, Node } from 'reactflow';
import { Handle, Position, useUpdateNodeInternals } from 'reactflow';
import { useDocs } from '../context/DocsContext';
import { getFocusedColor } from '../lib/colorUtils';

export interface NodeDataEditorProps<D extends Record<string, any>, T extends string | undefined = string | undefined> {
  node: Node<D, T>;
  updateNode: (update: Partial<Node<Partial<D>, T>>) => void;
}

export interface ResourceNodeData {
  resourceId?: string;
  speed?: number;
}

export function ResourceNode({ data, selected }: NodeProps<ResourceNodeData>) {
  const { resourceId, speed } = data;
  const rInfo =
    resourceId &&
    useDocs(
      ({ resources }) => {
        const resource = resources[resourceId];
        return { imgSrc: resource?.iconPath ?? null, itemName: resource?.displayName ?? 'Unknown' };
      },
      [resourceId],
    );

  return (
    <>
      <div
        className='flex min-h-24 flex-col items-center justify-center rounded-md px-4 py-1 text-primary-content outline-offset-2'
        style={{
          backgroundColor: (selected ? defaultNodeFocusedColor : defaultNodeColor).resource,
          outline: selected ? '2px solid ' + defaultNodeColor.resource : 'none',
        }}
      >
        {rInfo ? (
          <>
            {rInfo.imgSrc && <img src={rInfo.imgSrc} alt={rInfo.itemName} className='h-6 w-6' />}
            <p className='text-center font-semibold'>{rInfo.itemName}</p>
            <p className='text-center'>{speed} / min</p>
          </>
        ) : (
          <p className='text-center font-semibold'>Unset</p>
        )}
      </div>
      <Handle
        type='source'
        style={{ backgroundColor: (selected ? defaultNodeFocusedColor : defaultNodeColor).resource }}
        position={Position.Right}
      />
    </>
  );
}

export function ResourceNodeDataEditor(props: NodeDataEditorProps<ResourceNodeData, 'resource'>) {
  const dropdownRef = useRef<HTMLDetailsElement>(null);
  const resourceInfos = useDocs(d => d.resources);
  const options = useMemo(
    () => Object.values(resourceInfos).map(({ key, displayName }) => ({ value: key, label: displayName })),
    [resourceInfos],
  );
  const { node, updateNode } = props;

  return (
    <>
      <label htmlFor='resourceId' className='form-control w-full'>
        <div className='label'>
          <span className='label-text'>Resource: </span>
        </div>
        <details ref={dropdownRef} className='dropdown dropdown-top w-full'>
          <summary className='btn btn-sm btn-block'>
            {(node.data.resourceId && resourceInfos[node.data.resourceId].displayName) ?? 'Unset'}
          </summary>
          <ul className='clean-scrollbar menu dropdown-content menu-sm z-10 max-h-52 flex-nowrap overflow-y-scroll rounded-box bg-base-200 p-2 shadow-sm'>
            {options.map(({ value, label }) => (
              <li key={value}>
                <button
                  className='btn btn-sm btn-block items-start justify-start'
                  type='button'
                  onClick={() => {
                    updateNode({ ...node, data: { ...node.data, resourceId: value } });
                    dropdownRef.current?.removeAttribute('open');
                  }}
                >
                  {resourceInfos[value].iconPath && <img src={resourceInfos[value].iconPath!} alt={label} className='h-6 w-6' />}
                  {label}
                </button>
              </li>
            ))}
          </ul>
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
          onChange={e => updateNode({ ...node, data: { ...node.data, speed: +e.target.value } })}
        />
      </label>
    </>
  );
}

export interface ItemNodeData {
  /** Item id */
  itemId?: string;
  /** Production speed in item per minute */
  speed?: number;
}

export function ItemNode({ data, selected }: NodeProps<ItemNodeData>) {
  const { itemId, speed } = data;
  const itemInfo =
    itemId &&
    useDocs(
      ({ items }) => {
        const item = items[itemId];
        return { imgSrc: item?.iconPath ?? null, itemName: item?.displayName ?? 'Unknown' };
      },
      [itemId],
    );

  return (
    <>
      <Handle
        type='target'
        position={Position.Left}
        style={{ backgroundColor: (selected ? defaultNodeFocusedColor : defaultNodeColor).item }}
      />
      {
        <div
          className='flex min-h-24 flex-col items-center justify-center rounded-md px-4 py-1 text-primary-content outline-offset-2'
          style={{
            backgroundColor: (selected ? defaultNodeFocusedColor : defaultNodeColor).item,
            outline: selected ? '2px solid ' + defaultNodeColor.item : 'none',
          }}
        >
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
      }
      <Handle
        type='source'
        position={Position.Right}
        style={{ backgroundColor: (selected ? defaultNodeFocusedColor : defaultNodeColor).item }}
      />
    </>
  );
}

export function ItemNodeDataEditor(props: NodeDataEditorProps<ItemNodeData, 'item'>) {
  const dropdownRef = useRef<HTMLDetailsElement>(null);
  const itemInfos = useDocs(d => d.items);
  const [search, setSearch] = useState('');
  const filtered = useMemo(
    () => Object.values(itemInfos).filter(({ displayName }) => displayName.toLowerCase().includes(search.toLowerCase())),
    [itemInfos, search],
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
            <ul className='clean-scrollbar menu menu-horizontal menu-sm h-48 overflow-y-scroll'>
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
    </>
  );
}

export interface RecipeNodeData {
  recipeId?: string;
  /**
   * Clockspeeds in  thousandth of a percent
   *
   * clockspeed = (thouCs / 100000)%*/
  thouCs?: number;
}

export function RecipeNode({ id, data, selected }: NodeProps<RecipeNodeData>) {
  const { items, resources, recipes, productionMachines } = useDocs();
  const { recipeId, thouCs = 10000000 } = data;
  const updateNodeInternals = useUpdateNodeInternals();
  const prevRecipeId = useRef(data.recipeId);

  useEffect(() => {
    if (prevRecipeId.current !== recipeId) {
      updateNodeInternals(id);
      prevRecipeId.current = recipeId;
    }
  }, [recipeId]);

  if (!recipeId)
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

  const recipeInfo = recipes[recipeId];
  const machineInfo = productionMachines[recipeInfo.producedIn];
  const ingredientInfos = recipeInfo.ingredients?.map(({ itemKey }) => items[itemKey] ?? resources[itemKey] ?? { displayName: 'Unknown' });
  const productInfos = recipeInfo.products?.map(({ itemKey }) => items[itemKey] ?? resources[itemKey] ?? { displayName: 'Unknown' });

  return (
    <>
      {ingredientInfos?.map(({ form }, i, { length }) => (
        <Handle
          id={`in-${form}-${i}`}
          type='target'
          position={Position.Left}
          style={{
            backgroundColor: (selected ? defaultNodeFocusedColor : defaultNodeColor).recipe,
            top: `${((i + 1) / (length + 1)) * 100}%`,
          }}
        />
      ))}
      <div
        className='flex min-h-24 max-w-48 flex-col items-center justify-center rounded-md px-4 py-1 text-primary-content outline-offset-2'
        style={{
          backgroundColor: (selected ? defaultNodeFocusedColor : defaultNodeColor).recipe,
          outline: selected ? '2px solid ' + defaultNodeColor.recipe : 'none',
        }}
      >
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
      {productInfos?.map(({ form }, i, { length }) => (
        <Handle
          id={`out-${form}-${i}`}
          type='source'
          position={Position.Right}
          style={{
            backgroundColor: (selected ? defaultNodeFocusedColor : defaultNodeColor).recipe,
            top: `${((i + 1) / (length + 1)) * 100}%`,
            borderRadius: form === 'liquid' ? '0' : undefined,
          }}
        />
      ))}
    </>
  );
}

export function RecipeNodeDataEditor(props: NodeDataEditorProps<RecipeNodeData, 'recipe'>) {
  const { recipes, productionMachines, items, resources } = useDocs();
  const { node, updateNode } = props;
  const recipeInfo = node.data.recipeId && recipes[node.data.recipeId];

  const recipeDropdownRef = useRef<HTMLDetailsElement>(null);
  const [machineFilter, setMachineFiter] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const filteredRecipes = useMemo(
    () =>
      Object.values(recipes).filter(
        ({ displayName, producedIn }) =>
          displayName.toLowerCase().includes(search.toLowerCase()) && (!producedIn || !machineFilter || producedIn === machineFilter),
      ),
    [recipes, search, machineFilter ?? ''],
  );
  const getAnyIcon = useCallback(
    (key: string) => {
      if (items[key]?.iconPath) return <img src={items[key].iconPath!} alt={items[key].displayName} className='h-6 w-6' />;
      if (resources[key]?.iconPath) return <img src={resources[key].iconPath!} alt={resources[key].displayName} className='h-6 w-6' />;
      return null;
    },
    [items, resources],
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
    </>
  );
}

export interface LogisticNodeData {
  type?: 'splitter' | 'splitterSmart' | 'splitterProg' | 'merger';
  rules?: Record<'left' | 'center' | 'right', 'any' | 'none' | 'anyUndefined' | 'overflow' | `item: ${string}` | `resource: ${string}`>;
}

const logisticNames = {
  splitter: 'Splitter',
  splitterSmart: 'Smart Splitter',
  splitterProg: 'Programmable Splitter',
  merger: 'Merger',
} as const;

export function LogisticNode({ id, data, selected }: NodeProps<LogisticNodeData>) {
  const updateNodeInternals = useUpdateNodeInternals();
  const { type = 'splitter', rules } = data;
  const isSplitter = type.startsWith('splitter');
  const prevIsSplitter = useRef(isSplitter);

  useEffect(() => {
    if (prevIsSplitter.current !== isSplitter) {
      prevIsSplitter.current = isSplitter;
    }
  }, [isSplitter]);

  if (prevIsSplitter.current !== isSplitter) {
    updateNodeInternals(id);
  }

  if (!isSplitter) {
    return (
      <>
        <Handle
          id='left'
          type='target'
          position={Position.Left}
          style={{ backgroundColor: (selected ? defaultNodeFocusedColor : defaultNodeColor).logistic, top: '25%' }}
        />
        <Handle
          id='center'
          type='target'
          position={Position.Left}
          style={{ backgroundColor: (selected ? defaultNodeFocusedColor : defaultNodeColor).logistic, top: '50%' }}
        />
        <Handle
          id='right'
          type='target'
          position={Position.Left}
          style={{ backgroundColor: (selected ? defaultNodeFocusedColor : defaultNodeColor).logistic, top: '75%' }}
        />
        <div
          className='min-h-24 gap-1 rounded-md px-4 py-1 pt-5 text-primary-content outline-offset-2'
          style={{
            backgroundColor: (selected ? defaultNodeFocusedColor : defaultNodeColor).logistic,
            outline: selected ? '2px solid ' + defaultNodeColor.logistic : 'none',
          }}
        >
          <p className='row-span-3 h-min text-center font-semibold'>{logisticNames[type]}</p>
        </div>
        <Handle
          type='source'
          position={Position.Right}
          style={{ backgroundColor: (selected ? defaultNodeFocusedColor : defaultNodeColor).logistic }}
        />
      </>
    );
  }

  return (
    <>
      <Handle
        type='target'
        position={Position.Left}
        style={{ backgroundColor: (selected ? defaultNodeFocusedColor : defaultNodeColor).logistic }}
      />
      <div
        className='grid min-h-24 auto-cols-fr grid-flow-col grid-cols-1 grid-rows-3 place-items-center gap-1 rounded-md px-4 py-1 text-primary-content outline-offset-2'
        style={{
          backgroundColor: (selected ? defaultNodeFocusedColor : defaultNodeColor).logistic,
          outline: selected ? '2px solid ' + defaultNodeColor.logistic : 'none',
        }}
      >
        <p className='row-span-3 h-min w-min text-center font-semibold'>{logisticNames[type]}</p>
        {isSplitter && type !== 'splitter' && (
          <>
            <p className='text-center'>Left</p>
            <p className='text-center'>Center</p>
            <p className='text-center'>Right</p>
          </>
        )}
      </div>
      <Handle
        id='left'
        type='source'
        position={Position.Right}
        style={{ backgroundColor: (selected ? defaultNodeFocusedColor : defaultNodeColor).logistic, top: '25%' }}
      />
      <Handle
        id='center'
        type='source'
        position={Position.Right}
        style={{ backgroundColor: (selected ? defaultNodeFocusedColor : defaultNodeColor).logistic, top: '50%' }}
      />
      <Handle
        id='right'
        type='source'
        position={Position.Right}
        style={{ backgroundColor: (selected ? defaultNodeFocusedColor : defaultNodeColor).logistic, top: '75%' }}
      />
    </>
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
    </>
  );
}

// Used by ReactFlow to render custom nodes
export const nodeTypes = {
  item: ItemNode,
  resource: ResourceNode,
  recipe: RecipeNode,
  logistic: LogisticNode,
} as const;

export type NodeTypeKeys = keyof typeof nodeTypes;
export const nodeTypeKeys = Object.keys(nodeTypes) as NodeTypeKeys[];

export const defaultNodeColor = {
  resource: '#76BABF',
  item: '#B7A9DA',
  recipe: '#F6AD55',
  logistic: '#71DA8F',
} satisfies Record<NodeTypeKeys, string>;

export const defaultNodeFocusedColor = Object.fromEntries(
  Object.entries(defaultNodeColor).map(([k, v]) => [k, getFocusedColor(v)]),
) as Record<NodeTypeKeys, string>;

export const nodeEditors = {
  item: ItemNodeDataEditor,
  resource: ResourceNodeDataEditor,
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
