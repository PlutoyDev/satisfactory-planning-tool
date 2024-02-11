import React, { useMemo, useRef } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useState, useCallback } from 'react';
import ReactFlow, {
  Panel,
  Background,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Node,
  type Edge,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  type ReactFlowInstance,
} from 'reactflow';
import useLegacyEffect from '../hooks/useLegacyEffect';
import { ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/24/outline';
import { screwFactoryNode } from '../misc/screwTest';
import nodeTypes from '../components/CustomNodes';
import { loadProductionLine, saveProductionLine } from '../lib/ProductionLine';

export const routePattern = '/production-lines/:id' as const;

export function ProductionGraph() {
  const [, navigate] = useLocation();
  const [, params] = useRoute(routePattern);

  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const rfInstance = useRef<ReactFlowInstance | null>(null);

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
        console.log('RfInstance', !!rfInstance.current);
        rfInstance.current?.setViewport(viewport);
      }
    });
  }, [params?.id]);

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
        onInit={instance => (rfInstance.current = instance)}
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
                  saveProductionLine({ prodLineId: params?.id, nodes, edges, viewport: rfInstance.current?.getViewport()! });
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
        <Background />
      </ReactFlow>
    </div>
  );
}

// function RightSidePanel() {
//   return (
//     <div className='absolute z-[5] m-[15px] right-0 origin-center translate-y-1/2 pointer-events-none'></div>
//   );
// }

interface ExternalNodeProps {
  nodeEl: React.ReactElement;
  divElProps: React.HTMLProps<HTMLDivElement>;
}

function ExternalNode(props: ExternalNodeProps) {
  // Based on reactflow internal node component as it was not exported, so I had to make my own.
  // It doesn't have the same functionality, mainly use to render in side panel and drag into the graph
  const { nodeEl, divElProps } = props;
  return (
    <div className='absolute origin-center select-none' {...divElProps}>
      {nodeEl}
    </div>
  );
}

export default ProductionGraph;
