import { readFile, writeFile, mkdir } from 'fs/promises';
import { parseRecipe } from './recipeParser.js';
import { parseItem } from './itemParser.js';
import { parseProductionMachine } from './buildableParser.js';
import { parsePowerGenerator } from './generatorParser.js';

// Ensure the public/satisfactory directory exists
await mkdir('./public/satisfactory', { recursive: true }).catch(err => {
  if (err.code !== 'EEXIST') {
    console.error(err);
    process.exit(1);
  }
});

const minifyJson = !process.argv.includes('--no-minify');
if (!minifyJson) {
  console.log('Not minifying JSON');
}

const filePath = './res/docs.json';
const json = await readFile(filePath).catch(err => {
  console.error(err);
  console.log('Failed to read docs.json, docs.json must be manually copied to the root directory of this project.');
  process.exit(1);
});
const decoder = new TextDecoder('utf-16le');
const docs = JSON.parse(decoder.decode(json)) as unknown;

if (!docs || !Array.isArray(docs)) {
  throw new Error(`Invalid docs file: ${filePath}`);
}

const nativeClassRegex = /FactoryGame\.(.*)'/; //Sample: ///Script/CoreUObject.Class'/Script/FactoryGame.FGItemDescriptor'

const results = {
  items: {},
  recipes: {},
  productionMachines: {},
  generators: {},
} as {
  items: ReturnType<typeof parseItem>;
  recipes: ReturnType<typeof parseRecipe>;
  productionMachines: ReturnType<typeof parseProductionMachine>;
  generators: ReturnType<typeof parseProductionMachine>;
};

const itemClassNames = [
  'FGItemDescriptor',
  'FGItemDescriptorBiomass',
  'FGItemDescriptorNuclearFuel',
  'FGResourceDescriptor',
  'FGEquipmentDescriptor',
  'FGConsumableDescriptor',
  'FGAmmoTypeProjectile',
  'FGAmmoTypeSpreadshot',
  'FGAmmoTypeInstantHit',
];

const classesList: { nativeClass: string; classes: string[] }[] = [];

for (const doc of docs) {
  const nc = doc['NativeClass'];
  if (!nc) {
    continue;
  }
  const match = nc.match(nativeClassRegex);
  if (!match) {
    continue;
  }
  const className = match[1];
  if (itemClassNames.includes(className)) {
    results.items = Object.assign(results.items, parseItem(doc.Classes));
  } else if (className === 'FGRecipe') {
    results.recipes = parseRecipe(doc.Classes);
  } else if (
    ['FGBuildableManufacturer', 'FGBuildableManufacturerVariablePower', 'FGBuildableResourceExtractor', 'FGBuildableWaterPump'].includes(
      className,
    )
  ) {
    results.productionMachines = Object.assign(results.productionMachines, parseProductionMachine(doc.Classes));
  } else if (className === 'FGBuildableGeneratorFuel' || className === 'FGBuildableGeneratorNuclear') {
    results.generators = Object.assign(results.generators, parsePowerGenerator(doc.Classes));
  }

  classesList.push({
    nativeClass: className,
    classes: doc.Classes.map(({ ClassName }: Record<string, unknown>) => ClassName),
  });
}

function sortRecipes(recipeIds: string[]) {
  return recipeIds.sort((a, b) => {
    const recipeA = results.recipes[a];
    const recipeB = results.recipes[b];
    // Sort by isAlternate, then by ingredients length, then by products length, then by recipe name
    if (recipeA.displayName.startsWith('Alternate') && !recipeB.displayName.startsWith('Alternate')) {
      return 1;
    } else if (!recipeA.displayName.startsWith('Alternate') && recipeB.displayName.startsWith('Alternate')) {
      return -1;
    } else if (recipeA.ingredients.length < recipeB.ingredients.length) {
      return -1;
    } else if (recipeA.ingredients.length > recipeB.ingredients.length) {
      return 1;
    } else if (recipeA.products.length < recipeB.products.length) {
      return -1;
    } else if (recipeA.products.length > recipeB.products.length) {
      return 1;
    } else {
      return recipeA.displayName.localeCompare(recipeB.displayName);
    }
  });
}

// PostProcess
// Add recipeKeys to items and resources
for (const item of Object.values(results.items)) {
  const productOf: string[] = [];
  const ingredientOf: string[] = [];
  for (const [recipeKey, { ingredients, products }] of Object.entries(results.recipes)) {
    if (products?.some(product => product.itemKey === item.key)) {
      productOf.push(recipeKey);
    }
    if (ingredients?.some(ingredient => ingredient.itemKey === item.key)) {
      ingredientOf.push(recipeKey);
    }
  }

  if (productOf.length > 0) {
    item.productOf = sortRecipes(productOf);
  }

  if (ingredientOf.length > 0) {
    item.ingredientOf = sortRecipes(ingredientOf);
  }

  if (productOf.length === 0 && ingredientOf.length === 0) {
    console.error(`Item ${item.key} has no recipes that use / produce it`);
  }
}

for (const recipe of Object.values(results.recipes)) {
  // Check if the recipe ingredients/products are in the items list
  if (recipe.ingredients) {
    for (const ingredient of recipe.ingredients) {
      if (!results.items[ingredient.itemKey]) {
        console.error(`Missing item for recipe ingredient: ${ingredient.itemKey}`);
      }
    }
  }

  if (recipe.products) {
    for (const product of recipe.products) {
      if (!results.items[product.itemKey]) {
        console.error(`Missing item for recipe product: ${product.itemKey}`);
      }
    }
  }
}

await writeFile('./public/satisfactory/simplified-docs.json', JSON.stringify(results, null, minifyJson ? undefined : 2));
await writeFile('./public/satisfactory/classes-list.json', JSON.stringify(classesList, null, 2));
