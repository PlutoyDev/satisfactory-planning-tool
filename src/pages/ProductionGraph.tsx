import { forwardRef, useEffect, useRef } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useState, useCallback } from 'react';
import { ReactFlow, Panel, Background, addEdge, applyEdgeChanges, applyNodeChanges, useReactFlow } from 'reactflow';
import type { Node, Edge, OnConnect, OnNodesChange, OnEdgesChange, PanelPosition } from 'reactflow';
import useLegacyEffect from '../hooks/useLegacyEffect';
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
  nodeTypeKeys,
  defaultNodeColor,
  type NodeTypeKeys,
  type FactoryNodeData,
  ResourceNodeDataEditor,
  FactoryNodeProperties,
  ItemNodeDataEditor,
} from '../components/FactoryGraph';
import { loadProductionLine, saveProductionLine } from '../lib/ProductionLine';
import { useDocs } from '../context/DocsContext';
import { nanoid } from 'nanoid';
import { ProductionLineInfo, useProductionLineInfos } from '../context/ProdLineInfoContext';
import debounce from 'lodash/debounce';

export const routePattern = '/production-lines/:id' as const;

export function ProductionGraph() {
  const [, navigate] = useLocation();
  const [, params] = useRoute(routePattern);
  const docs = useDocs();

  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const rfInstance = useReactFlow<FactoryNodeData>();
  const [selectedNodeId, setSelectedNodeId] = useState(undefined as string | undefined);

  const elRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  //ReactFlow handlers
  const onNodesChange: OnNodesChange = useCallback(changes => (setNodes(nds => applyNodeChanges(changes, nds)), setSaved(false)), []);
  const onEdgesChange: OnEdgesChange = useCallback(changes => (setEdges(eds => applyEdgeChanges(changes, eds)), setSaved(false)), []);
  const onConnect: OnConnect = useCallback(connection => (setEdges(edges => addEdge(connection, edges)), setSaved(false)), []);
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow') as NodeTypeKeys;
      if (!type) return;
      const pos = rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setNodes(nds => [...nds, { id: nanoid(), type, position: pos, data: {} }]);
      console.log('Dropped', type, pos);
    },
    [rfInstance],
  );

  useLegacyEffect(() => {
    loadProductionLine({ prodLineId: params?.id }).then(({ nodes, edges, viewport }) => {
      setLoading(false);
      setNodes(nodes);
      setEdges(edges);
      setSaved(true);
      if (viewport) {
        rfInstance.setViewport(viewport, { duration: 100 });
      }
    });
  }, [params?.id, rfInstance]);

  const save = () => {
    setSaving(false);
    saveProductionLine({ prodLineId: params?.id, nodes, edges, viewport: rfInstance.getViewport() }).then(() => {
      setSaved(true);
    });
  };

  const debouncedSave = useCallback(debounce(save, 3000, { maxWait: 10 }), [save]);

  useEffect(() => {
    if (saved) {
      return;
    }
    setSaving(true);
    debouncedSave();
  }, [saved, debouncedSave]);

  if (loading) {
    return <div className='skeleton h-full w-full' />;
  }

  return (
    <div className='h-full w-full bg-base-300' ref={elRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        // TODO: Make a better attribution, then hide this (It doesn't look good with this background)
        proOptions={{ hideAttribution: false }}
        onDrop={onDrop}
        onDragOver={e => (e.preventDefault(), (e.dataTransfer.dropEffect = 'move'))}
        //Keyboard Props
        deleteKeyCode={['Delete', 'Backspace']}
        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        onPaneClick={() => setSelectedNodeId(undefined)}
      >
        <Panel position='top-center'>
          <div className='flex items-center space-x-2 rounded-sm bg-base-100 p-1 shadow-lg'>
            <div className='tooltip tooltip-bottom' data-tip='Save'>
              <button
                className='btn btn-square btn-ghost btn-sm'
                type='button'
                onClick={() => {
                  saveProductionLine({ prodLineId: params?.id, nodes, edges, viewport: rfInstance.getViewport()! });
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
            <div className='tooltip tooltip-bottom' data-tip='Test'>
              <button
                className='btn btn-square btn-ghost btn-sm'
                type='button'
                onClick={() => {
                  setNodes(nds => [...nds, ...screwFactoryNode]);
                }}
              >
                🧪
              </button>
            </div>
          </div>
        </Panel>
        <ProductionLineInfoEditPanel prodLineId={params?.id!} isSaving={saving} isSaved={saved} saveFn={save} />
        <NodePickerPanel />
        <NodeDataEditorPanel selectedNodeId={selectedNodeId} />
        <Background />
      </ReactFlow>
    </div>
  );
}

interface NodeDataEditorPanelProps {
  selectedNodeId?: string;
}

function NodeDataEditorPanel({ selectedNodeId }: NodeDataEditorPanelProps) {
  const rfInstance = useReactFlow<FactoryNodeData>();
  const selectedNode = selectedNodeId && (rfInstance.getNode(selectedNodeId) as FactoryNodeProperties);
  if (!selectedNode || selectedNode.type !== 'item') {
    return (
      <Panel position='bottom-right'>
        <div className='w-64 rounded-md bg-base-100 p-2 shadow-lg first:rounded-t-md last:rounded-b-md [&>*]:w-full '>
          <h3 className='whitespace-nowrap font-bold'>Node Property</h3>
          <hr className='mt-1 pt-2' />
          <p>{!selectedNode ? 'No node selected / found' : 'incompatible node'}</p>
        </div>
      </Panel>
    );
  }
  return (
    <Panel position='bottom-right'>
      <div className='w-64 rounded-md bg-base-100 p-2 shadow-lg first:rounded-t-md last:rounded-b-md [&>*]:w-full '>
        <h3 className='whitespace-nowrap font-bold'>Node Property</h3>
        <hr className='mt-1 pt-2' />
        <ItemNodeDataEditor
          node={selectedNode}
          updateNode={u => rfInstance.setNodes(nds => nds.map(n => (n.id === u.id ? { ...n, ...u } : n)))}
        />
      </div>
    </Panel>
  );
}

interface ProductionLineInfoEditPanelProps {
  prodLineId: string;
  isSaving: boolean;
  isSaved: boolean;
  saveFn: () => void;
}

function ProductionLineInfoEditPanel({ prodLineId, isSaving, isSaved, saveFn }: ProductionLineInfoEditPanelProps) {
  const iconPaths = useDocs(
    ({ resources, items }) => [...Object.values(items), ...Object.values(resources)].map(i => i.iconPath).filter(Boolean) as string[],
  );
  const { getPlInfo, updatePlInfo, deletePl } = useProductionLineInfos();
  const plInfo = getPlInfo(prodLineId);
  const setPlInfo = useCallback(
    (info: Partial<ProductionLineInfo>) => {
      updatePlInfo({ ...plInfo, ...info, id: prodLineId });
    },
    [plInfo, updatePlInfo],
  );
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDetailsElement | null>(null);
  const closeDialogRef = useRef<HTMLDialogElement | null>(null);

  if (!plInfo) throw new Error('Production Line not found');

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
              value={plInfo.title}
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
                  const [hasIcon, setHasIcon] = useState(true);
                  if (hasIcon === false) {
                    return null;
                  }
                  return (
                    <button type='button' key={i} onClick={() => (setPlInfo({ icon }), dropdownRef.current?.removeAttribute('open'))}>
                      <img src={icon} alt='' onError={() => setHasIcon(false)} className='h-6 w-6' />
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
                  <button className='btn btn-error btn-sm' onClick={() => deletePl(prodLineId)}>
                    Yes
                  </button>
                </div>
              </div>
              <form method='dialog' className='modal-backdrop'>
                <button>close</button>
              </form>
            </dialog>
          </div>
          <button type='button' className='btn btn-sm' disabled={isSaving || isSaved} onClick={saveFn}>
            {isSaving ? (
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
  resource: 'Resource',
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
