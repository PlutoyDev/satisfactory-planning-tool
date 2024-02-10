// Reactflow custom nodes
import { use, type ComponentType } from 'react';
import type { NodeProps, Node } from 'reactflow';
import { Handle, Position } from 'reactflow';
import useDocs from '../hooks/useDocs';

// function NodeSuspenseWrapper<Props extends {}>(Node: ComponentType<Props>) {
//   return function WrappedNode(props: Props) {
//     return (
//       <Suspense fallback={<div>Loading...</div>}>
//         <Node {...props} />
//       </Suspense>
//     );
//   };
// }

export interface ItemNodeData {
  /** Item id */
  id?: string;
  /** Production speed in item per minute */
  speed?: number;
}

export function ItemNode({ data }: NodeProps) {
  const { id, speed } = data as ItemNodeData;
  const itemName = id ? useDocs(({ items, resources }) => items[id]?.displayName ?? 'Oops', [id]) : 'Unknown';

  return (
    <>
      <Handle type='target' position={Position.Left} />
      <div className='flex flex-col items-center justify-center'>
        <p className='text-center font-semibold'>{itemName}</p>
        <p className='text-center'>{speed} / min</p>
      </div>
      <Handle type='source' position={Position.Right} />
    </>
  );
}

export interface ResourceNodeData {
  id?: string;
  speed?: number;
}

export function ResourceNode({ data }: NodeProps) {
  const { id, speed } = data as ResourceNodeData;
  const rInfo =
    id &&
    useDocs(({ resources }) => {
      const resource = resources[id];
      return { imgSrc: resource?.iconPath ?? null, itemName: resource?.displayName ?? 'Unknown' };
    });

  return (
    <>
      <div className='flex flex-col items-center justify-center rounded-md bg-[#76BABF] px-4 py-1 text-primary-content'>
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
      <Handle className='bg-[#76BABF]' type='source' position={Position.Right} />
    </>
  );
}

export const nodeTypes = {
  item: ItemNode,
  resource: ResourceNode,
} satisfies Record<string, ComponentType<NodeProps>>;

type CustomNodeDataMap = {
  item: ItemNodeData;
  resource: ResourceNodeData;
};

export type FactoryNode = Node<CustomNodeDataMap[keyof CustomNodeDataMap], keyof CustomNodeDataMap>;

export default nodeTypes;
