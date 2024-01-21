const eStackSize = {
  SS_ONE: 1,
  SS_SMALL: 50,
  SS_MEDIUM: 100,
  SS_BIG: 500,
  SS_HUGE: 1000,
  SS_FLUID: 1000,
} as const;

const mapperObject = {
  ClassName: {
    into: "key",
  },
  mDisplayName: {
    into: "displayName",
  },
  mDescription: {
    into: "description",
  },
  mAbbreviatedDisplayName: {
    into: "abbreviatedDisplayName",
  },
  mStackSize: {
    into: "stackSize",
    transform: (i: string) => eStackSize[i as keyof typeof eStackSize],
  },
  mResourceSinkPoints: {
    into: "sinkPoints",
    transform: (i: string) => parseInt(i),
  },
  mEnergyValue: {
    into: "energyValue",
    transform: (i: string) => parseFloat(i),
  },
  mForm: {
    into: "form",
    transform: (i: "RF_SOLID" | "RF_LIQUID" | "RF_GAS") =>
      ({ RF_SOLID: "solid", RF_LIQUID: "liquid", RF_GAS: "gas" })[i] ?? null,
  },
} as const;

const filterKey = ["Desc_HUBParts_C"];

type MapperObject = typeof mapperObject;

export type Item = {
  key: string;
  displayName: string;
  description: string;
  abbreviatedDisplayName: string;
  stackSize: number;
  sinkPoints: number;
  energyValue: number;
  form: "solid" | "liquid" | "gas" | null;
  productOf?: string[];
  ingredientOf?: string[];
};

export function parseItem(itemArr: Record<string, unknown>[]) {
  return itemArr.reduce(
    (acc, item) => {
      const parsedItem = {} as Item;
      if (filterKey.includes(item.ClassName as string)) {
        return acc;
      }
      for (const [key, value] of Object.entries(item)) {
        const mapper = mapperObject[key as keyof MapperObject];
        if (!mapper) {
          continue;
        }
        if ("transform" in mapper) {
          // @ts-ignore
          parsedItem[mapper.into] = mapper.transform(value as string);
        } else {
          // @ts-ignore
          parsedItem[mapper.into] = value as string;
        }
      }
      acc[parsedItem.key] = parsedItem;
      return acc;
    },
    {} as Record<string, Item>,
  ) as Record<string, Item>;
}

export type Resource = Item;

export function parseResource(resourceArr: Record<string, unknown>[]) {
  return parseItem(resourceArr) as Record<string, Resource>;
}
