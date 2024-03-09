import { getSmoothStepPath, ConnectionLineComponentProps } from 'reactflow';

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
  const [dAttr, labelX, labelY] = getSmoothStepPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
  });

  return (
    <g className='pointer-events-none z-50' d={dAttr}>
      <path d={dAttr} strokeWidth={2} fill='none' className={`${connectionStatus === 'valid' ? 'stroke-success' : 'stroke-error'}`} />
      <text x={labelX} y={labelY} textAnchor='middle' className='text-sm font-semibold text-base-content'>
        {connectionStatus === 'valid' ? '✓' : '✕'}
      </text>
      {/* TODO: Display itemSpeed for this connection using fromNode and fromHandle and getting pre computed result from store */}
    </g>
  );
}

export default ConnectionLine;
