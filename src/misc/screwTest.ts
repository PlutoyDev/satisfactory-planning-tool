// Production Line for screw factory
import type { Node, Edge } from 'reactflow';
import type { FactoryNode } from '../components/CustomNodes';
export const screwFactoryNode: FactoryNode[] = [
  {
    id: '1',
    type: 'resource',
    position: { x: 100, y: 0 },
    data: {
      id: 'Desc_OreIron_C',
      speed: 30,
    },
  },
];
