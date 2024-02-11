// Production Line for screw factory
import type { FactoryNodeProperties } from '../components/FactoryGraph';
export const screwFactoryNode: FactoryNodeProperties[] = [
  {
    id: '1',
    type: 'resource',
    data: { resourceId: 'Desc_OreIron_C', speed: 30 },
    position: { x: -164, y: 5 },
  },
  {
    id: 'final',
    type: 'item',
    data: { itemId: 'Desc_IronScrew_C', speed: 120 },
    position: { x: 1160, y: 0 },
  },
  {
    id: 'ingots',
    type: 'recipe',
    data: { recipeId: 'Recipe_IngotIron_C', qty: 1 },
    position: { x: -5, y: 20 },
  },
  {
    id: 'merge',
    type: 'logistic',
    data: { type: 'merger' },
    position: { x: 719, y: 17 },
  },
  {
    id: 'rods1',
    type: 'recipe',
    data: { recipeId: 'Recipe_IronRod_C' },
    position: { x: 358, y: -30 },
  },
  {
    id: 'rods2',
    type: 'recipe',
    data: { recipeId: 'Recipe_IronRod_C' },
    position: { x: 345, y: 70 },
  },
  {
    id: 'screws1',
    type: 'recipe',
    data: { recipeId: 'Recipe_Screw_C' },
    position: { x: 867, y: 145 },
  },
  {
    id: 'screws2',
    type: 'recipe',
    data: { recipeId: 'Recipe_Screw_C' },
    position: { x: 861, y: 20 },
  },
  {
    id: 'screws3',
    type: 'recipe',
    data: { recipeId: 'Recipe_Screw_C' },
    position: { x: 863, y: -100 },
  },
  {
    id: 'split1',
    type: 'logistic',
    data: { type: 'splitter' },
    position: { x: 204, y: 15 },
  },
  {
    id: 'split2a',
    type: 'logistic',
    data: { type: 'splitter' },
    position: { x: 578, y: -70 },
  },
  {
    id: 'split2b',
    type: 'logistic',
    data: { type: 'splitter' },
    position: { x: 586, y: 100 },
  },
  {
    id: 'merge2',
    type: 'logistic',
    data: { type: 'merger' },
    position: { x: 1040, y: 15 },
  },
];
