import { readFile, writeFile } from "fs/promises";
import { parseRecipe } from "./recipeParser.js";
import { parseItem } from "./itemParser.js";
import { parseProductionMachine } from "./buildableParser.js";
import { parsePowerGenerator } from "./generatorParser.js";

const filePath = "./res/docs.json";
const json = await readFile(filePath).catch((err) => {
  console.error(err);
  console.log("Failed to read docs.json, docs.json must be manually copied to the root directory of this project.");
  process.exit(1);
});
const decoder = new TextDecoder("utf-16le");
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
  resources: {},
} as {
  items: ReturnType<typeof parseItem>;
  recipes: ReturnType<typeof parseRecipe>;
  productionMachines: ReturnType<typeof parseProductionMachine>;
  generators: ReturnType<typeof parseProductionMachine>;
  resources: ReturnType<typeof parseItem>;
};

const classesList: { nativeClass: string; classes: string[] }[] = [];

for (const doc of docs) {
  const nc = doc["NativeClass"];
  if (!nc) {
    continue;
  }
  const match = nc.match(nativeClassRegex);
  if (!match) {
    continue;
  }
  const className = match[1];
  if (["FGItemDescriptor", "FGItemDescriptorBiomass"].includes(className)) {
    results.items = Object.assign(results.items, parseItem(doc.Classes));
  } else if (className === "FGResourceDescriptor") {
    results.resources = Object.assign(results.resources, parseItem(doc.Classes));
  } else if (className === "FGRecipe") {
    results.recipes = parseRecipe(doc.Classes);
  } else if (
    [
      "FGBuildableManufacturer",
      "FGBuildableManufacturerVariablePower",
      "FGBuildableResourceExtractor",
      "FGBuildableWaterPump",
    ].includes(className)
  ) {
    results.productionMachines = Object.assign(results.productionMachines, parseProductionMachine(doc.Classes));
  } else if (className === "FGBuildableGeneratorFuel" || className === "FGBuildableGeneratorNuclear") {
    results.generators = Object.assign(results.generators, parsePowerGenerator(doc.Classes));
  }

  classesList.push({
    nativeClass: className,
    classes: doc.Classes.map(({ ClassName }: Record<string, unknown>) => ClassName),
  });
}

// PostProcess
// Add recipeKeys to items and resources
for (const item of [...Object.values(results.items), ...Object.values(results.resources)]) {
  const productOf: string[] = [];
  const ingredientOf: string[] = [];
  for (const [recipeKey, { ingredients, products }] of Object.entries(results.recipes)) {
    if (products?.some((product) => product.itemKey === item.key)) {
      productOf.push(recipeKey);
    }
    if (ingredients?.some((ingredient) => ingredient.itemKey === item.key)) {
      ingredientOf.push(recipeKey);
    }
  }

  if (productOf.length > 0) {
    item.productOf = productOf;
  }

  if (ingredientOf.length > 0) {
    item.ingredientOf = ingredientOf;
  }
}

await writeFile("./public/parsed-data.json", JSON.stringify(results, null, 2));
