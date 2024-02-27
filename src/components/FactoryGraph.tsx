// Reactflow custom nodes
import { useRef, useEffect, type ComponentType, useMemo, useState, useCallback, Fragment } from 'react';
import type { NodeProps, Node } from 'reactflow';
import { Handle, Position, useUpdateNodeInternals } from 'reactflow';
import { useDocs } from '../context/DocsContext';
import Fuse from 'fuse.js';
import StoredClockspeed from '../utils/clockspeed';

export interface NodeDataEditorProps<D extends Record<string, any>, T extends string | undefined = undefined> {
  node: Node<D, T>;
  updateNode: (update: Partial<Node<Partial<D>, T>>) => void;
}

export interface BaseNodeData {
  rotation?: number;
  bgColor?: string;
}

const FactoryIODirOrder = ['left', 'top', 'right', 'bottom'] as const;
type FactoryIODir = (typeof FactoryIODirOrder)[number];
type FactoryIO = `${FactoryIODir}:${'solid' | 'fluid'}:${'in' | 'out'}`;

export interface BaseNodeProps extends NodeProps<BaseNodeData> {
  children: React.ReactNode;
  backgroundColor: string;
  factoryIO: FactoryIO[];
}

function BaseNode({ children, backgroundColor, factoryIO, id, data, selected }: BaseNodeProps) {
  const { rotation = 0, bgColor = backgroundColor } = data;
  const isPrediction = id.startsWith('predict');
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
        className='rounded-md p-1.5 text-primary-content outline-offset-2'
        style={{
          backgroundColor: bgColor,
          outline: !isPrediction && selected ? '2px solid ' + bgColor : 'none',
          opacity: isPrediction ? 0.3 : 1,
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
              opacity: isPrediction ? 0.3 : 1,
            }}
            className='h-2 w-2'
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
          onClick={() => updateData({ rotation: ((node.data.rotation ?? 0) + 270) % 360 })}
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
      <div className='flex h-20 w-20 flex-col items-center justify-center'>
        {itemInfo ? (
          <>
            {itemInfo.imgSrc && <img src={itemInfo.imgSrc} alt={itemInfo.itemName} className='h-8 w-8' />}
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
  storedCs?: number;
}

export function RecipeNode(props: NodeProps<RecipeNodeData>) {
  const { data, selected } = props;
  const { items, recipes, productionMachines } = useDocs();
  const { recipeId, storedCs = StoredClockspeed.FromDecimal(1) } = data;
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
          backgroundColor: defaultNodeColor.recipe,
          outline: selected ? '2px solid ' + defaultNodeColor.recipe : 'none',
        }}
      >
        <p className='text-center font-semibold'>Unset</p>
      </div>
    );

  const { factoryIO, recipeInfo, machineInfo, ingredientInfos, productInfos } = res;

  return (
    <BaseNode {...props} backgroundColor={defaultNodeColor.recipe} factoryIO={factoryIO}>
      <div className='flex h-36 w-36 flex-col items-center justify-center'>
        {recipeInfo ? (
          <>
            {/* <p className='text-pretty text-center font-semibold'>{recipeInfo.displayName}</p> */}
            <div className='grid grid-flow-col grid-rows-2 place-items-center gap-0.5'>
              {ingredientInfos?.map(
                ({ iconPath, displayName }, i, { length: l }) =>
                  iconPath && (
                    <img
                      key={iconPath}
                      src={iconPath}
                      alt={displayName}
                      className='h-8 w-8'
                      style={{ gridRow: l % 2 == 1 && i == l - 1 ? 'span 2 / span 2' : undefined }}
                    />
                  ),
              )}
              <p className='row-span-full'>➔</p>
              {productInfos?.map(
                ({ iconPath, displayName }, i, { length: l }) =>
                  iconPath && (
                    <img
                      key={iconPath}
                      src={iconPath}
                      alt={displayName}
                      className='h-8 w-8'
                      style={{ gridRow: l % 2 == 1 && i == l - 1 ? 'span 2 / span 2' : undefined }}
                    />
                  ),
              )}
            </div>
          </>
        ) : (
          <p className='text-center font-semibold'>Unset</p>
        )}
        {machineInfo ? (
          <p className='text-center'>
            {StoredClockspeed.ToPercent(storedCs)}% {machineInfo.displayName}
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
                      {ingredients?.map(({ itemKey }) => {
                        const item = items[itemKey];
                        return (
                          item?.iconPath && <img key={item.iconPath} src={item.iconPath!} alt={item.displayName} className='h-6 w-6' />
                        );
                      })}
                      ➔
                      {products?.map(({ itemKey }) => {
                        const item = items[itemKey];
                        return (
                          item?.iconPath && <img key={item.iconPath} src={item.iconPath!} alt={item.displayName} className='h-6 w-6' />
                        );
                      })}
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
          value={node.data.storedCs ? StoredClockspeed.ToPercent(node.data.storedCs) : 100}
          onChange={e => updateNode({ ...node, data: { ...node.data, storedCs: StoredClockspeed.FromPercent(+e.target.value) } })}
        />
      </label>
      <BaseNodeEditor {...props} />
    </>
  );
}

const logisticNames = {
  splitter: 'Splitter',
  splitterSmart: 'Smart Splitter',
  splitterPro: 'Programmable Splitter',
  merger: 'Merger',
  pipeJunc: 'Pipeline Junction',
} as const;

const splitterOutputs = ['left', 'center', 'right'] as const;
type SplitterOutput = (typeof splitterOutputs)[number];

const outputRuleNames = {
  any: 'Any',
  none: 'None',
  anyUndefined: 'Any Undefined',
  overflow: 'Overflow',
} as const;

type OutputRuleName = keyof typeof outputRuleNames | `item:${string}`;

export interface LogisticNodeData extends BaseNodeData {
  type?: keyof typeof logisticNames;
  rules?: Partial<Record<SplitterOutput, OutputRuleName[]>>;
  pipeInOut?: { left?: 'in' | 'out'; right?: 'in' | 'out'; top?: 'in' | 'out'; bottom?: 'in' | 'out' };
}

export function LogisticNode(props: NodeProps<LogisticNodeData>) {
  const { type = 'splitter', rules, pipeInOut = { left: 'in' } } = props.data;
  const isSplitter = type.startsWith('splitter');
  const isPipeJunc = type === 'pipeJunc';

  const factoryIO = useMemo(() => {
    if (isPipeJunc) return FactoryIODirOrder.map(dir => `${dir}:fluid:${pipeInOut[dir] ?? 'out'}`) as FactoryIO[];
    if (isSplitter) return ['left:solid:in', 'top:solid:out', 'bottom:solid:out', 'right:solid:out'] satisfies FactoryIO[];
    return ['left:solid:in', 'top:solid:in', 'bottom:solid:in', 'right:solid:out'] satisfies FactoryIO[];
  }, [isSplitter, isPipeJunc, pipeInOut]);

  return (
    <BaseNode {...props} factoryIO={factoryIO} backgroundColor={defaultNodeColor.logistic}>
      <div className='flex h-8 w-8 flex-col items-center justify-center'></div>
    </BaseNode>
  );
}

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

export function LogisticNodeDataEditor(props: NodeDataEditorProps<LogisticNodeData, 'logistic'>) {
  const { items } = useDocs();
  const { node, updateNode } = props;
  const { type = 'splitter', rules = { center: ['any'] }, pipeInOut = { left: 'in' } } = node.data;
  const updateSmartProOutput = useCallback(
    (dir: SplitterOutput, rule: string, selected: boolean | undefined) => {
      if (type === 'splitterSmart') {
        updateNode({ ...node, data: { ...node.data, rules: { ...rules, [dir]: selected ? ['none'] : [rule as OutputRuleName] } } });
      } else if (rule === 'none') {
        updateNode({ ...node, data: { ...node.data, rules: { ...rules, [dir]: ['none'] } } });
      } else if (selected) {
        const newRules = rules[dir]?.filter(r => r !== rule && r !== 'none');
        updateNode({ ...node, data: { ...node.data, rules: { ...rules, [dir]: newRules?.length ? newRules : undefined } } });
      } else {
        const newRules = (rules[dir]?.filter(r => r !== 'none') ?? []).concat(rule as OutputRuleName);
        updateNode({ ...node, data: { ...node.data, rules: { ...rules, [dir]: newRules } } });
      }
    },
    [updateNode, type, rules],
  );
  const [smartOutputConfiguring, setSmartOutputConfiguring] = useState<null | SplitterOutput>(null);
  // const smartDropdownRef = useRef<HTMLDetailsElement>(null);
  const [search, setSearch] = useState('');
  const options = useMemo(() => {
    const options: [string, { label: string; value: string; icon?: string }][] = [];
    for (const [key, name] of Object.entries(outputRuleNames)) {
      // TODO: Find icons for these
      options.push([key, { label: name, value: key }]);
    }
    for (const item of Object.values(items)) {
      options.push([`item:${item.key}`, { label: item.displayName, value: `item:${item.key}`, icon: item.iconPath ?? undefined }]);
    }
    return Object.fromEntries(options);
  }, [items]);
  const ruleFuse = useMemo(() => new Fuse(Object.values(options), { keys: ['label'] }), [options]);
  const listedOptions = useMemo(() => {
    // List of options to display with search and selected options
    if (smartOutputConfiguring === null) return [];
    let listedOptions: { label: string; value: string; icon?: string; selected?: boolean }[] = [];
    let selectedKeys = rules[smartOutputConfiguring] ?? [];
    const res = search ? ruleFuse.search(search) : Object.values(options);
    for (const val of res) {
      const item = 'item' in val ? val.item : val;
      if (selectedKeys.includes(item.value as OutputRuleName)) {
        listedOptions.unshift({ ...item, selected: true });
      } else {
        listedOptions.push({ ...item, selected: false });
      }
    }
    return listedOptions;
  }, [rules, smartOutputConfiguring, search, ruleFuse, options, updateSmartProOutput]);

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
          {
            Object.entries(logisticNames).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            )) as any
          }
        </select>
      </label>
      {(type === 'splitterSmart' || type === 'splitterPro') && (
        <label htmlFor='rules' className='form-control w-full'>
          <div className='label'>
            <span className='label-text text-pretty'>Rules: </span>
          </div>
          <details className='dropdown dropdown-top w-full' open={smartOutputConfiguring !== null}>
            <summary className='hidden' />
            {
              <div className='dropdown-content right-0 z-10 w-72 rounded-box bg-base-200 p-2 shadow-sm'>
                <input
                  type='text'
                  className='input input-sm input-bordered mb-1 w-full'
                  placeholder='Search...'
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <ul className='clean-scrollbar menu menu-horizontal menu-sm h-48 w-full overflow-y-scroll'>
                  {listedOptions.map(({ value, icon, label, selected }) => (
                    <li className='w-full' key={value}>
                      <button
                        className={`btn btn-sm btn-block items-start justify-start ${selected ? 'btn-secondary' : ''}`}
                        type='button'
                        onClick={() => {
                          updateSmartProOutput(smartOutputConfiguring!, value, selected);
                          setSmartOutputConfiguring(null);
                        }}
                      >
                        {icon && <img src={icon} alt={label} className='h-6 w-6' />}
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            }
          </details>
          {/* List the rules */}
          <div className='grid grid-flow-col grid-cols-[auto_auto_auto] grid-rows-2 place-items-center gap-x-4 gap-y-1'>
            {splitterOutputs.map(dir => (
              <>
                <button
                  type='button'
                  key={dir}
                  className='btn btn-sm gap-y-1 text-xs'
                  onClick={() => {
                    if (smartOutputConfiguring === dir) setSmartOutputConfiguring(null);
                    else if (smartOutputConfiguring === null) setSmartOutputConfiguring(dir);
                    else {
                      setSmartOutputConfiguring(null);
                      setTimeout(() => setSmartOutputConfiguring(dir), 100);
                    }
                  }}
                >
                  <span>{capitalize(dir)}</span>
                </button>
                <div className='flex flex-col flex-wrap gap-2'>
                  {(rules?.[dir] ?? ['none']).map(rule => (
                    <p key={rule} className='w-full max-w-full text-pretty text-center text-xs'>
                      {rule.startsWith('item:')
                        ? items[rule.split(':')[1]].displayName
                        : outputRuleNames[rule as keyof typeof outputRuleNames]}
                    </p>
                  ))}
                </div>
              </>
            ))}
          </div>
        </label>
      )}
      {type === 'pipeJunc' && (
        <label htmlFor='pipeInOut' className='form-control w-full'>
          <div className='label'>
            <span className='label-text'>Pipe In/Out: </span>
          </div>
          <div className='grid grid-cols-4 gap-x-4 px-2'>
            {FactoryIODirOrder.map(dir => (
              <Fragment key={dir}>
                <span>{capitalize(dir)}:</span>
                <button
                  type='button'
                  className='btn btn-square btn-xs ml-3 rounded-sm'
                  onClick={() =>
                    updateNode({
                      ...node,
                      data: { ...node.data, pipeInOut: { ...pipeInOut, [dir]: pipeInOut[dir] === 'in' ? 'out' : 'in' } },
                    })
                  }
                >
                  {capitalize(pipeInOut[dir] ?? 'out')}
                </button>
              </Fragment>
            ))}
          </div>
        </label>
      )}
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
