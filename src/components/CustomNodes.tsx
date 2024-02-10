// Reactflow custom nodes
import { use, type ComponentType } from 'react';
import type { NodeProps, Node } from 'reactflow';
import { Handle, Position } from 'reactflow';
import useDocs, { Item } from '../hooks/useDocs';

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

export function ItemNode({ data }: NodeProps<ItemNodeData>) {
  const { id, speed } = data;
  const itemInfo =
    id &&
    useDocs(({ items }) => {
      const item = items[id];
      return { imgSrc: item?.iconPath ?? null, itemName: item?.displayName ?? 'Unknown' };
    });

  return (
    <>
      <Handle type='target' className='bg-[#B7A9DA]' position={Position.Left} />
      {
        <div className='flex flex-col items-center justify-center rounded-md bg-[#B7A9DA] px-4 py-1 text-primary-content'>
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
      <Handle type='source' className='bg-[#B7A9DA]' position={Position.Right} />
    </>
  );
}

export interface ResourceNodeData {
  id?: string;
  speed?: number;
}

export function ResourceNode({ data }: NodeProps<ResourceNodeData>) {
  const { id, speed } = data;
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
      <Handle type='source' className='bg-[#76BABF]' position={Position.Right} />
    </>
  );
}

export interface ProductionMachineNodeData {
  recipeId?: string;
  machineId?: string;
  clockspeeds?: number;
  qty?: number;
}

export function ProductionMachineNode({ data }: NodeProps<ProductionMachineNodeData>) {
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
      <Handle type='target' className='bg-[#F6AD55]' position={Position.Left} />
      <div className='flex flex-col items-center justify-center rounded-md bg-[#F6AD55] px-4 py-1 text-primary-content'>
        {recipeInfo ? (
          <p className='text-center font-semibold'>{recipeInfo.displayName}</p>
        ) : (
          <p className='text-center font-semibold'>Unset</p>
        )}
        {machineInfo ? (
          <p className='text-center'>
            {qty}x {clockspeeds * 100}% {machineInfo.displayName}
          </p>
        ) : (
          <p className='text-center font-semibold'>Unset</p>
        )}
      </div>
      <Handle type='source' className='bg-[#F6AD55]' position={Position.Right} />
    </>
  );
}

export const nodeTypes = {
  item: ItemNode,
  resource: ResourceNode,
  productionMachine: ProductionMachineNode,
} satisfies Record<string, ComponentType<NodeProps>>;

type CustomNodeDataMap = {
  item: ItemNodeData;
  resource: ResourceNodeData;
  productionMachine: ProductionMachineNodeData;
};

export type FactoryNode = Node<CustomNodeDataMap[keyof CustomNodeDataMap], keyof CustomNodeDataMap>;

export default nodeTypes;
