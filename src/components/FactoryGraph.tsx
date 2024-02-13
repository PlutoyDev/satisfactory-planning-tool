// Reactflow custom nodes
import { useRef, useEffect, type ComponentType, useMemo, useState } from 'react';
import type { NodeProps, Node } from 'reactflow';
import { Handle, Position, useUpdateNodeInternals } from 'reactflow';
import { useDocs } from '../context/DocsContext';

interface NodeDataEditorProps<D extends Record<string, any>, T extends string | undefined = string | undefined> {
  node: Node<D, T>;
  updateNode: (update: Partial<Node<Partial<D>, T>>) => void;
}

export interface ResourceNodeData {
  resourceId?: string;
  speed?: number;
}

export function ResourceNode({ data }: NodeProps<ResourceNodeData>) {
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
        className='flex flex-col items-center justify-center rounded-md px-4 py-1 text-primary-content'
        style={{ backgroundColor: defaultNodeColor.resource }}
      >
        {rInfo ? (
          <>
            {rInfo.imgSrc && <img src={rInfo.imgSrc} alt={rInfo.itemName} className='h-8 w-8' />}
            <p className='text-center font-semibold'>{rInfo.itemName}</p>
            <p className='text-center'>{speed} / min</p>
          </>
        ) : (
          <p className='text-center font-semibold'>Unset</p>
        )}
      </div>
      <Handle type='source' style={{ backgroundColor: defaultNodeColor.resource }} position={Position.Right} />
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
          <ul className='menu dropdown-content menu-sm z-10 max-h-52 w-56 overflow-y-scroll rounded-box bg-base-200 p-2 shadow-sm'>
            {options.map(({ value, label }) => (
              <li key={value}>
                <button
                  className='btn btn-sm btn-block'
                  type='button'
                  onClick={() => {
                    updateNode({ ...node, data: { ...node.data, resourceId: value } });
                    dropdownRef.current?.removeAttribute('open');
                  }}
                >
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
          className='input input-bordered appearance-none'
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

export function ItemNode({ data }: NodeProps<ItemNodeData>) {
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
      <Handle type='target' position={Position.Left} style={{ backgroundColor: defaultNodeColor.item }} />
      {
        <div
          className='flex flex-col items-center justify-center rounded-md px-4 py-1 text-primary-content'
          style={{ backgroundColor: defaultNodeColor.item }}
        >
          {itemInfo ? (
            <>
              {itemInfo.imgSrc && <img src={itemInfo.imgSrc} alt={itemInfo.itemName} className='h-8 w-8' />}
              <p className='text-center font-semibold'>{itemInfo.itemName}</p>
              <p className='text-center'>{speed} / min</p>
            </>
          ) : (
            <p className='text-center font-semibold'>Unset</p>
          )}
        </div>
      }
      <Handle type='source' position={Position.Right} style={{ backgroundColor: defaultNodeColor.item }} />
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
            <ul className='menu menu-horizontal menu-sm h-48 overflow-y-scroll '>
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
  machineId?: string;
  clockspeeds?: number;
  qty?: number;
}

export function RecipeNode({ data }: NodeProps<RecipeNodeData>) {
  const { recipeId, machineId, clockspeeds = 1, qty } = data;
  const recipeInfo = useDocs(({ recipes }) => (recipeId ? recipes[recipeId] : undefined), [recipeId]);
  const machineInfo = useDocs(
    ({ productionMachines }) =>
      machineId || recipeInfo?.producedIn ? productionMachines[(machineId ?? recipeInfo?.producedIn) as string] : undefined,
    [machineId, recipeInfo?.producedIn],
  );

  return (
    <>
      <Handle type='target' position={Position.Left} style={{ backgroundColor: defaultNodeColor.recipe }} />
      <div
        className='flex flex-col items-center justify-center rounded-md px-4 py-1 text-primary-content'
        style={{ backgroundColor: defaultNodeColor.recipe }}
      >
        {recipeInfo ? (
          <p className='text-center font-semibold'>{recipeInfo.displayName}</p>
        ) : (
          <p className='text-center font-semibold'>Unset</p>
        )}
        {machineInfo ? (
          <p className='text-center'>
            {qty ? `${qty}x` : ''} {clockspeeds * 100}% {machineInfo.displayName}
          </p>
        ) : (
          <p className='text-center font-semibold'>Unset</p>
        )}
      </div>
      <Handle type='source' position={Position.Right} style={{ backgroundColor: defaultNodeColor.recipe }} />
    </>
  );
}

export function RecipeNodeDataEditor(props: NodeDataEditorProps<RecipeNodeData, 'recipe'>) {
  const { recipes, productionMachines } = useDocs(({ recipes, productionMachines }) => ({ recipes, productionMachines }));
  const { node, updateNode } = props;
  const recipeInfo = node.data.recipeId && recipes[node.data.recipeId];
  const machineInfo = node.data.machineId
    ? productionMachines[node.data.machineId]
    : recipeInfo
      ? productionMachines[recipeInfo.producedIn]
      : undefined;

  const recipeDropdownRef = useRef<HTMLDetailsElement>(null);
  const machineDropdownRef = useRef<HTMLDetailsElement>(null);
  const [search, setSearch] = useState('');
  const filteredRecipes = useMemo(
    () =>
      Object.values(recipes).filter(
        ({ displayName, producedIn }) =>
          displayName.toLowerCase().includes(search.toLowerCase()) &&
          (!producedIn || !node.data.machineId || producedIn === node.data.machineId),
      ),
    [recipes, search, node.data.machineId ?? ''],
  );

  return (
    <>
      <label htmlFor='recipeId' className='form-control w-full'>
        <div className='label'>
          <span className='label-text'>Recipe: </span>
        </div>
        <details ref={recipeDropdownRef} className='dropdown dropdown-top w-full'>
          <summary className='btn btn-sm btn-block'>{recipeInfo ? recipeInfo.displayName : 'Unset'}</summary>
          <div className='dropdown-content right-0 z-10 w-72 rounded-box bg-base-200 p-2 shadow-sm'>
            <input
              type='text'
              className='input input-sm input-bordered mb-1 w-full'
              placeholder='Search...'
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <ul className='menu menu-horizontal menu-sm h-48 overflow-y-scroll '>
              {filteredRecipes.map(({ key, displayName }) => (
                <li className='w-full' key={key}>
                  <button
                    className='btn btn-sm btn-block items-start justify-start'
                    type='button'
                    onClick={e => {
                      if (node.data.machineId) {
                        delete node.data.machineId;
                      }
                      updateNode({ ...node, data: { ...node.data, recipeId: key } });
                      recipeDropdownRef.current?.removeAttribute('open');
                    }}
                  >
                    {displayName}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </details>
      </label>
      <label htmlFor='machineId' className='form-control w-full'>
        <div className='label'>
          <span className='label-text'>Machine: </span>
        </div>
        <details ref={machineDropdownRef} className='dropdown dropdown-top w-full'>
          <summary className='btn btn-sm btn-block'>{machineInfo ? machineInfo.displayName : 'Unset'}</summary>
          <ul className='menu dropdown-content menu-sm z-10 max-h-52 w-56 flex-nowrap overflow-y-scroll rounded-box bg-base-200 p-2 shadow-sm'>
            {Object.values(productionMachines).map(({ key, displayName }) => (
              <li className='w-full' key={key}>
                <button
                  className='btn btn-sm btn-block'
                  type='button'
                  onClick={() => {
                    if (recipeInfo && recipeInfo?.producedIn !== key) {
                      delete node.data.recipeId;
                    }
                    updateNode({ ...node, data: { ...node.data, machineId: key } });
                    machineDropdownRef.current?.removeAttribute('open');
                  }}
                >
                  {displayName}
                </button>
              </li>
            ))}
          </ul>
        </details>
      </label>
      <label htmlFor='clockspeeds' className='form-control w-full'>
        <div className='label'>
          <span className='label-text'>Clockspeeds: </span>
        </div>
        <input
          id='clockspeeds'
          type='number'
          className='input input-sm input-bordered appearance-none'
          defaultValue={node.data.clockspeeds}
          onChange={e => updateNode({ ...node, data: { ...node.data, clockspeeds: +e.target.value } })}
        />
      </label>
      <label htmlFor='qty' className='form-control w-full'>
        <div className='label'>
          <span className='label-text'>Quantity: </span>
        </div>
        <input
          id='qty'
          type='number'
          className='input input-sm input-bordered appearance-none'
          defaultValue={node.data.qty}
          onChange={e => updateNode({ ...node, data: { ...node.data, qty: +e.target.value } })}
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

export function LogisticNode({ id, data }: NodeProps<LogisticNodeData>) {
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
        <Handle id='left' type='target' position={Position.Left} style={{ backgroundColor: defaultNodeColor.logistic, top: '25%' }} />
        <Handle id='center' type='target' position={Position.Left} style={{ backgroundColor: defaultNodeColor.logistic, top: '50%' }} />
        <Handle id='right' type='target' position={Position.Left} style={{ backgroundColor: defaultNodeColor.logistic, top: '75%' }} />
        <div
          className='min-h-16 gap-1 rounded-md px-4 py-1 pt-5 text-primary-content'
          style={{ backgroundColor: defaultNodeColor.logistic }}
        >
          <p className='row-span-3 h-min text-center font-semibold'>{logisticNames[type]}</p>
        </div>
        <Handle type='source' position={Position.Right} style={{ backgroundColor: defaultNodeColor.logistic }} />
      </>
    );
  }

  return (
    <>
      <Handle type='target' position={Position.Left} style={{ backgroundColor: defaultNodeColor.logistic }} />
      <div
        className='grid min-h-16 auto-cols-fr grid-cols-1 grid-rows-3 place-items-center gap-1 rounded-md px-4 py-1 text-primary-content'
        style={{ backgroundColor: defaultNodeColor.logistic }}
      >
        <p className='row-span-3 h-min text-center font-semibold'>{logisticNames[type]}</p>
        {isSplitter && type !== 'splitter' && (
          <>
            <p className='text-center'>Left</p>
            <p className='text-center'>Center</p>
            <p className='text-center'>Right</p>
          </>
        )}
      </div>
      <Handle id='left' type='source' position={Position.Right} style={{ backgroundColor: defaultNodeColor.logistic, top: '25%' }} />
      <Handle id='center' type='source' position={Position.Right} style={{ backgroundColor: defaultNodeColor.logistic, top: '50%' }} />
      <Handle id='right' type='source' position={Position.Right} style={{ backgroundColor: defaultNodeColor.logistic, top: '75%' }} />
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
          className='select select-bordered w-full'
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
