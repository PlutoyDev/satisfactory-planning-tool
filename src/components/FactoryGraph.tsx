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
  const options = useMemo(
    () =>
      Object.values(itemInfos).reduce(
        (acc, { key, displayName, iconPath }) => {
          if (search && !displayName.toLowerCase().includes(search.toLowerCase())) return acc;
          return [...acc, { key, displayName, iconPath }];
        },
        [] as { key: string; displayName: string; iconPath: string }[],
      ),
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
            {node.data.itemId ? (
              <>
                <img src={selInfo.iconPath} alt={selInfo.displayName} className='h-6 w-6' />
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
              {options.map(({ key, iconPath, displayName }) => (
                <li className='w-full' key={key}>
                  <button
                    className='btn btn-sm btn-block items-start justify-start'
                    type='button'
                    onClick={e => {
                      updateNode({ ...node, data: { ...node.data, itemId: key } });
                      dropdownRef.current?.removeAttribute('open');
                    }}
                  >
                    <img src={iconPath} alt={displayName} className='h-6 w-6' />
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
  const recipeInfo = recipeId ? useDocs(({ recipes }) => recipes[recipeId], [recipeId]) : undefined;
  const machineInfo =
    machineId || recipeInfo?.producedIn
      ? useDocs(
          ({ productionMachines }) => productionMachines[(machineId ?? recipeInfo?.producedIn) as string],
          [machineId, recipeInfo?.producedIn],
        )
      : undefined;

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

type CustomNodeDataMap = {
  [K in NodeTypeKeys]: (typeof nodeTypes)[K] extends ComponentType<NodeProps<infer D>> ? D : never;
};

type CustomNodePropertiesMap = {
  [K in NodeTypeKeys]: Node<CustomNodeDataMap[K], K>;
};

export type FactoryNodeData = CustomNodeDataMap[NodeTypeKeys];
export type FactoryNodeProperties = CustomNodePropertiesMap[NodeTypeKeys];
