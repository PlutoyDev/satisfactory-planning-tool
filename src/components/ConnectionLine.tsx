import { getSmoothStepPath, ConnectionLineComponentProps } from '@xyflow/react';
import { useProductionLineStore } from '../lib/store';

export function ConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
  connectionStatus,
  fromNode,
  fromHandle,
}: ConnectionLineComponentProps) {
  const { invalidConnectionReason } = useProductionLineStore('invalidConnectionReason');
  const [dAttr, labelX, labelY] = getSmoothStepPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
  });

  const isError = connectionStatus === 'invalid' && invalidConnectionReason;

  return (
    <g className='react-flow__connection pointer-events-none z-50' d={dAttr}>
      <path
        d={dAttr}
        strokeWidth={2}
        fill='none'
        className={`react-flow__connection-path ${isError ? 'stroke-error' : connectionStatus === 'valid' ? 'stroke-success' : ''}`}
      />
      {connectionStatus === 'invalid' && (
        <text x={labelX} y={labelY + 20} textAnchor='middle' className='fill-error text-sm font-semibold '>
          {invalidConnectionReason}
        </text>
      )}
      {/* TODO: Display itemSpeed for this connection using fromNode and fromHandle and getting pre computed result from store */}
    </g>
  );
}

export default ConnectionLine;
