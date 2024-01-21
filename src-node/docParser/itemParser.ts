import { copyFile, mkdir } from 'fs/promises';
import { readFileSync, statSync } from 'fs';

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
    into: 'key',
  },
  mDisplayName: {
    into: 'displayName',
  },
  mDescription: {
    into: 'description',
  },
  mAbbreviatedDisplayName: {
    into: 'abbreviatedDisplayName',
  },
  mStackSize: {
    into: 'stackSize',
    transform: (i: string) => eStackSize[i as keyof typeof eStackSize],
  },
  mResourceSinkPoints: {
    into: 'sinkPoints',
    transform: (i: string) => parseInt(i),
  },
  mEnergyValue: {
    into: 'energyValue',
    transform: (i: string) => parseFloat(i),
  },
  mForm: {
    into: 'form',
    transform: (i: 'RF_SOLID' | 'RF_LIQUID' | 'RF_GAS') =>
      ({ RF_SOLID: 'solid', RF_LIQUID: 'liquid', RF_GAS: 'gas' }[i] ?? null),
  },
  mPersistentBigIcon: {
    into: 'iconPath',
    transform: (i: string) => {
      const path = i.substring(28).split('.')[0];
      const originalPath = `res/extracted/FactoryGame/${path}.png`;
      try {
        statSync(originalPath, { throwIfNoEntry: true });
        const newName = path.split('/').pop()?.replace('IconDesc_', '');
        const newPath = `public/satisfactory/icons/${newName}.png`;
        copyFile(originalPath, newPath);
        return newPath.substring(6);
      } catch (e) {
        console.log("File doesn't exist", originalPath);
        return null;
      }
    },
  },
  mSmallIcon: {
    into: 'smallIconBase64',
    transform: (i: string) => {
      if (!i.includes('_256')) return null;
      const path = i.substring(28).split('.')[0].replace('_256', '_64');
      const fullPath = `res/extracted/FactoryGame/${path}.png`;
      try {
        return readFileSync(fullPath, { encoding: 'base64' });
      } catch (e) {
        return null;
      }
    },
  },
} as const;

const filterKey = ['Desc_HUBParts_C'];

type MapperObject = typeof mapperObject;

export type Item = {
  key: string;
  displayName: string;
  description: string;
  abbreviatedDisplayName: string;
  stackSize: number;
  sinkPoints: number;
  energyValue: number;
  form: 'solid' | 'liquid' | 'gas' | null;
  productOf?: string[];
  ingredientOf?: string[];
  iconPath: string | null;
  smallIconBase64: string | null;
};

export function parseItem(itemArr: Record<string, unknown>[]) {
  mkdir('./public/satisfactory/icons', { recursive: true });

  return itemArr.reduce((acc, item) => {
    const parsedItem = {} as Item;
    if (filterKey.includes(item.ClassName as string)) {
      return acc;
    }
    for (const [key, value] of Object.entries(item)) {
      const mapper = mapperObject[key as keyof MapperObject];
      if (!mapper) {
        continue;
      }
      if ('transform' in mapper) {
        // @ts-ignore
        parsedItem[mapper.into] = mapper.transform(value as string);
      } else {
        // @ts-ignore
        parsedItem[mapper.into] = value as string;
      }
    }
    acc[parsedItem.key] = parsedItem;
    return acc;
  }, {} as Record<string, Item>) as Record<string, Item>;
}

export type Resource = Item;

export function parseResource(resourceArr: Record<string, unknown>[]) {
  return parseItem(resourceArr) as Record<string, Resource>;
}
