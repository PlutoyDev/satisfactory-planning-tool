// Production Line for screw factory
import type { Node, Edge } from 'reactflow';
import type { FactoryNodeProperties } from '../components/FactoryGraph';
export const screwFactoryNode: FactoryNodeProperties[] = [
  {
    id: '1',
    type: 'resource',
    position: { x: 100, y: 0 },
    data: {
      resourceId: 'Desc_OreIron_C',
      speed: 30,
    },
  },
  {
    id: 'ingots',
    type: 'productionMachine',
    position: { x: 230, y: 16 },
    data: {
      recipeId: 'Recipe_IngotIron_C',
      clockspeeds: 1,
      qty: 1,
    },
  },
  {
    id: 'rods',
    type: 'productionMachine',
    position: { x: 400, y: 16 },
    data: {
      recipeId: 'Recipe_IronRod_C',
      clockspeeds: 1,
      qty: 2,
    },
  },
  {
    id: 'screws',
    type: 'productionMachine',
    position: { x: 600, y: 16 },
    data: {
      recipeId: 'Recipe_Screw_C',
      clockspeeds: 1,
      qty: 3,
    },
  },
  {
    id: 'final',
    type: 'item',
    position: { x: 800, y: 0 },
    data: {
      itemId: 'Desc_IronScrew_C',
      speed: 120,
    },
  },
];
