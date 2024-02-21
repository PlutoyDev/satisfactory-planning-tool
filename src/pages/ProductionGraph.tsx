import { useEffect, useRef, useState, useCallback, type ComponentType } from 'react';
import { ReactFlow, Panel, Background, useReactFlow, ConnectionLineType } from 'reactflow';
import {
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  TrashIcon,
  CheckCircleIcon,
  ArchiveBoxArrowDownIcon,
} from '@heroicons/react/24/outline';
import { screwFactoryNode } from '../misc/screwTest';
import {
  nodeTypes,
  nodeEditors,
  nodeTypeKeys,
  defaultNodeColor,
  type NodeTypeKeys,
  type NodeDataEditorProps,
} from '../components/FactoryGraph';
import { useDocs } from '../context/DocsContext';
import { useProductionLineStore } from '../lib/store';

import useLegacyEffect from '../hooks/useLegacyEffect';
import { useLocation, useRoute } from 'wouter';
import { ProductionLineInfo } from '../lib/productionLine';

export const routePattern = '/production-line/:id' as const;

export function ProductionGraph() {
  // Full screen
  const elRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [, params] = useRoute(routePattern);

  const {
    loading,
    selInfo,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onSelectionChange,
    onDrop,
    saveFullProductionLineToIdb,
    loadProductionLineFromIdb,
    setRfInstance,
  } = useProductionLineStore();

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        // If user exit fullscreen using the escape key or the browser's UI
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [setIsFullscreen]);

  useLegacyEffect(() => {
    if (!selInfo) {
      if (params?.id) {
        loadProductionLineFromIdb(params.id);
      }
    }
  }, [selInfo, params?.id, loadProductionLineFromIdb]);

  if (loading === 'productionLine' || !selInfo) {
    return <div className='skeleton h-full w-full' />;
  }

  return (
    <div className='h-full w-full bg-base-300' ref={elRef}>
      <ReactFlow
        // Common Props
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        // TODO: Make a better attribution, then hide this (It doesn't look good with this background)
        proOptions={{ hideAttribution: false }}
        // Viewport Props
        minZoom={0.1}
        snapToGrid={true}
        snapGrid={[10, 10]}
        // Event Handlers - General Events
        onInit={setRfInstance}
        // Event Handlers - Selection Events
        onSelectionChange={onSelectionChange}
        // Connection Line Props
        connectionRadius={50}
        connectionLineType={ConnectionLineType.SmoothStep}
        //Keyboard Props
        deleteKeyCode={['Delete', 'Backspace']}
        // HTML Div Props
        onDrop={onDrop}
        onDragOver={e => (e.preventDefault(), (e.dataTransfer.dropEffect = 'move'))}
      >
        <Panel position='top-center'>
          <div className='flex items-center space-x-2 rounded-sm bg-base-100 p-1 shadow-lg'>
            <div className='tooltip tooltip-bottom' data-tip='Save'>
              <button
                className='btn btn-square btn-ghost btn-sm'
                type='button'
                onClick={() => {
                  saveFullProductionLineToIdb();
                }}
              >
                💾
              </button>
            </div>
            <div className='tooltip tooltip-bottom' data-tip='Fullscreen'>
              <button
                className='btn btn-square btn-ghost btn-sm'
                type='button'
                onClick={() => {
                  if (elRef.current) {
                    if (isFullscreen) {
                      document.exitFullscreen();
                    } else {
                      elRef.current.requestFullscreen();
                    }
                    setIsFullscreen(f => !f);
                  }
                }}
              >
                {isFullscreen ? (
                  <ArrowsPointingInIcon className='h-5 w-5 text-base-content' />
                ) : (
                  <ArrowsPointingOutIcon className='h-5 w-5 text-base-content' />
                )}
              </button>
            </div>
          </div>
        </Panel>
        <ProductionLineInfoEditPanel />
        <NodePickerPanel />
        <NodeDataEditorPanel />
        <Background />
      </ReactFlow>
    </div>
  );
}

function NodeDataEditorPanel() {
  const { selNode, onNodesChange } = useProductionLineStore('selNode', 'onNodesChange');

  if (!selNode || !selNode.type || !(selNode.type in nodeEditors)) {
    return (
      <Panel position='bottom-right'>
        <div className='w-64 rounded-md bg-base-100 p-2 shadow-lg first:rounded-t-md last:rounded-b-md [&>*]:w-full '>
          <h3 className='whitespace-nowrap font-bold'>Node Property</h3>
          <hr className='mt-1 pt-2' />
          <p>{!selNode ? 'No node selected / found' : 'incompatible node'}</p>
        </div>
      </Panel>
    );
  }

  const Editor = nodeEditors[selNode.type as NodeTypeKeys];
  return (
    <Panel position='bottom-right'>
      <div className='w-64 rounded-md bg-base-100 p-2 shadow-lg first:rounded-t-md last:rounded-b-md [&>*]:w-full '>
        <h3 className='whitespace-nowrap font-bold'>Node Property</h3>
        <hr className='mt-1 pt-2' />

        <Editor
          // @ts-expect-error
          node={selNode}
          updateNode={u => onNodesChange([{ type: 'reset', item: { ...selNode, ...u } }])}
        />
      </div>
    </Panel>
  );
}

function ProductionLineInfoEditPanel() {
  const navigate = useLocation()[1];
  const iconPaths = useDocs(({ items }) => Object.values(items).map(i => i.iconPath));
  const { isSaved, saving, selInfo, setProductionLineInfos, saveFullProductionLineToIdb } = useProductionLineStore(
    'isSaved',
    'saving',
    'selInfo',
    'setProductionLineInfos',
    'saveFullProductionLineToIdb',
  );
  const setPlInfo = useCallback(
    (info: Partial<ProductionLineInfo>) => {
      setProductionLineInfos(pls => pls.map(pl => (pl.id === selInfo?.id ? { ...pl, ...info } : pl)));
    },
    [setProductionLineInfos, selInfo?.id],
  );
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDetailsElement | null>(null);
  const closeDialogRef = useRef<HTMLDialogElement | null>(null);

  if (!selInfo) throw new Error('Production Line not found');

  return (
    <Panel position='top-left'>
      <div
        ref={panelRef}
        className='rounded-md bg-base-100 p-2 shadow-lg'
        onMouseLeave={() => dropdownRef.current?.matches(':hover') || dropdownRef.current?.removeAttribute('open')}
      >
        <span className='inline whitespace-nowrap font-bold'>Production Line Property</span>
        <hr className='mt-1 pt-2' />
        <div className='grid grid-cols-3 grid-rows-2 place-items-center gap-2 text-center font-semibold'>
          <div className='col-span-3 '>
            <label className='mr-2 inline' htmlFor='title'>
              Title:
            </label>
            <input
              type='text'
              id='title'
              value={selInfo.title}
              onChange={e => setPlInfo({ title: e.target.value })}
              className='input input-sm input-primary'
            />
          </div>
          <details ref={dropdownRef} className='dropdown dropdown-bottom inline-block'>
            <summary className='btn btn-sm btn-block'>Change Icon</summary>
            <div
              className='clean-scrollbar dropdown-content max-h-24 overflow-y-auto rounded-box bg-base-100 p-2 shadow-sm'
              onMouseLeave={() => panelRef.current?.matches(':hover') || dropdownRef.current?.removeAttribute('open')}
            >
              <div className='grid w-max auto-rows-fr grid-cols-8 gap-1'>
                {iconPaths.map((icon, i) => {
                  const [hasIcon, setHasIcon] = useState(!!icon);
                  if (hasIcon === false) {
                    return null;
                  }
                  return (
                    <button
                      type='button'
                      key={i}
                      onClick={() => {
                        setPlInfo({ icon: icon! });
                        dropdownRef.current?.removeAttribute('open');
                      }}
                    >
                      <img src={icon!} alt='' onError={() => setHasIcon(false)} className='h-6 w-6' />
                    </button>
                  );
                })}
              </div>
            </div>
          </details>
          <div>
            <button
              type='button'
              className='btn btn-error btn-sm'
              onClick={() => {
                closeDialogRef.current?.showModal();
              }}
            >
              <TrashIcon className='h-5 w-5' />
              Delete
            </button>
            <dialog ref={closeDialogRef} className='modal'>
              <div className='modal-box'>
                <form method='dialog'>
                  <button className='btn btn-circle btn-ghost btn-sm absolute right-2 top-2'>✕</button>
                </form>
                <p>Are you sure you want to delete this production line?</p>
                <div className='modal-action'>
                  <button className='btn btn-sm' onClick={() => closeDialogRef.current?.close()}>
                    No
                  </button>
                  <button
                    className='btn btn-error btn-sm'
                    onClick={() => {
                      closeDialogRef.current?.close();
                      setProductionLineInfos(pls => pls.filter(pl => pl.id !== selInfo.id));
                      navigate('/');
                    }}
                  >
                    Yes
                  </button>
                </div>
              </div>
              <form method='dialog' className='modal-backdrop'>
                <button>close</button>
              </form>
            </dialog>
          </div>
          <button
            type='button'
            className='btn btn-sm'
            disabled={saving === 'productionLine' || isSaved}
            onClick={saveFullProductionLineToIdb}
          >
            {saving === 'productionLine' ? (
              <>
                <span className='loading loading-spinner loading-sm' />
                Saving
              </>
            ) : isSaved ? (
              <>
                <CheckCircleIcon className='h-5 w-5' />
                Saved
              </>
            ) : (
              <>
                <ArchiveBoxArrowDownIcon className='h-5 w-5' />
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </Panel>
  );
}

const nodeNames = {
  item: 'Item',
  recipe: 'Recipe',
  logistic: 'Logistic',
} as const satisfies Record<NodeTypeKeys, string>;

function NodePickerPanel() {
  return (
    <Panel position='top-right'>
      <div className='w-48 rounded-md bg-base-100 p-2 shadow-lg first:rounded-t-md last:rounded-b-md [&>*]:w-full '>
        <h3 className='whitespace-nowrap font-bold'>Node List</h3>
        <hr className='mt-1 pt-2' />
        <div className='grid grid-cols-2 place-items-center gap-2 text-center font-semibold text-primary-content'>
          {nodeTypeKeys.map(key => (
            <div
              key={key}
              style={{ backgroundColor: defaultNodeColor[key] }}
              className='w-full cursor-pointer rounded-md px-2 py-1'
              onDragStart={e => {
                e.dataTransfer.setData('application/reactflow', key);
                e.dataTransfer.effectAllowed = 'move';
              }}
              draggable
            >
              {nodeNames[key]}
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

export default ProductionGraph;
