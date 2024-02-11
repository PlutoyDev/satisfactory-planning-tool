import { nanoid } from 'nanoid';
import { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'wouter';

interface ProductionLineInfo {
  id: string;
  title: string;
  icon: string;
}

interface ProductionLineContextValue {
  productionLineInfos: ProductionLineInfo[];
  getPlInfo: (id: string) => ProductionLineInfo | undefined;
  createPl: (toNavigate?: boolean) => void;
  updatePlInfo: (info: Partial<ProductionLineInfo> & { id: string }) => void;
  deletePl: (id: string) => void;
  reorderPl: (id: string, newIndex: number) => void;
}

export const ProductionLineInfoContext = createContext({} as ProductionLineContextValue);

interface ProviderProps {
  children: React.ReactNode;
}

function getInitialInfos(): ProductionLineInfo[] {
  const stored = localStorage.getItem('prodInfos');
  return stored ? JSON.parse(stored) : [];
}

function saveInfos(infos: ProductionLineInfo[]) {
  localStorage.setItem('prodInfos', JSON.stringify(infos));
}

export function ProductionLineInfoProvider({ children }: ProviderProps) {
  const [productionLineInfos, setProductionLineInfos] = useState<ProductionLineInfo[]>(getInitialInfos);
  const [, setLocation] = useLocation();

  useEffect(() => {
    saveInfos(productionLineInfos);
  }, [productionLineInfos]);

  const value: ProductionLineContextValue = {
    productionLineInfos,
    getPlInfo: id => productionLineInfos.find(info => info.id === id),
    createPl: (toNavigate = true) => {
      const id = nanoid(8);
      setProductionLineInfos(cur => [...cur, { id, title: 'Unnamed Production Line', icon: '???' }]);
      if (toNavigate) setLocation(`/production-lines/${id}`);
    },
    updatePlInfo: info => {
      setProductionLineInfos(cur => cur.map(eInfo => (eInfo.id === info.id ? { ...eInfo, ...info } : eInfo)));
    },
    deletePl: id => {
      setProductionLineInfos(cur => cur.filter(info => info.id !== id));
      setLocation('/');
    },
    reorderPl: (id, newIndex) => {
      setProductionLineInfos(cur => {
        const index = cur.findIndex(info => info.id === id);
        const info = cur[index];
        // First toSpliced is to remove the item from the array, second toSpliced is to insert it at the new index
        return cur.toSpliced(index, 1).toSpliced(newIndex, 0, info);
      });
    },
  };

  return <ProductionLineInfoContext.Provider value={value}>{children}</ProductionLineInfoContext.Provider>;
}

export function useProductionLineInfos() {
  return useContext(ProductionLineInfoContext);
}
