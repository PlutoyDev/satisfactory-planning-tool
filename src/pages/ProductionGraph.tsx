import { useMemo, useRef } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useState, useCallback } from 'react';
import ReactFlow, { Panel, Background, addEdge, applyEdgeChanges, applyNodeChanges, useReactFlow, BackgroundVariant } from 'reactflow';
import type { Node, Edge, OnConnect, OnNodesChange, OnEdgesChange, NodeProps } from 'reactflow';
import useLegacyEffect from '../hooks/useLegacyEffect';
import { ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/24/outline';
import { screwFactoryNode } from '../misc/screwTest';
import nodeTypes, { FactoryNodeData } from '../components/FactoryGraph';
import { loadProductionLine, saveProductionLine } from '../lib/ProductionLine';
import { useDocs } from '../context/DocsContext';

export const routePattern = '/production-lines/:id' as const;

export function ProductionGraph() {
  const [, navigate] = useLocation();
  const [, params] = useRoute(routePattern);
  const docs = useDocs();

  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const rfInstance = useReactFlow<FactoryNodeData>();

  const elRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  //ReactFlow handlers
  const onNodesChange: OnNodesChange = useCallback(changes => setNodes(nds => applyNodeChanges(changes, nds)), []);
  const onEdgesChange: OnEdgesChange = useCallback(changes => setEdges(eds => applyEdgeChanges(changes, eds)), []);
  const onConnect: OnConnect = useCallback(connection => setEdges(edges => addEdge(connection, edges)), []);

  useLegacyEffect(() => {
    loadProductionLine({ prodLineId: params?.id }).then(({ nodes, edges, viewport }) => {
      setLoading(false);
      setNodes(nodes);
      setEdges(edges);
      if (viewport) {
        rfInstance.setViewport(viewport, { duration: 300 });
      }
    });
  }, [params?.id, rfInstance]);

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
        <NodePickerPanel />
        <Background />
      </ReactFlow>
    </div>
  );
}

function NodePickerPanel() {
  return (
    <Panel position='top-right'>
      <div className='w-48 rounded-md bg-base-100 p-2 pt-0 shadow-lg first:rounded-t-md last:rounded-b-md [&>*]:w-full '>
        <h3 className='whitespace-nowrap text-lg font-bold'>Node List</h3>
        <div className='divider !my-0' />
        {/* Body */}
        <div className='grid grid-cols-2 place-items-center gap-2 text-center font-semibold text-primary-content'>
          <div className='h-full w-full cursor-pointer rounded-md bg-[#76BABF] px-2 py-1' draggable>
            Resource
          </div>
          <div className='h-full w-full cursor-pointer rounded-md bg-[#B7A9DA] px-2 py-1'>Item</div>
          <div className='h-full w-full cursor-pointer rounded-md bg-[#F6AD55] px-2 py-1' draggable>
            Recipe
          </div>
          <div className='h-full w-full cursor-pointer rounded-md bg-[#71DA8F] px-2 py-1' draggable>
            Logistic
          </div>
        </div>
      </div>
    </Panel>
  );
}

export default ProductionGraph;
