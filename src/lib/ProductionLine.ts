// Handle data loading and saving into the local storage.
// Each production line is searialized into a JSON string (or other format) and deflated with fflate library to save space.
// Each production line auto contains a meta-data like id, title, icon and description that is part of a array (that is not compressed) and is used quickly display the navigation menu.
// The types of production lines will be implemented at a later date.
// For now just meta-data is saved.

import { deflate, inflate } from "fflate";

type ProductionLineId = string;

function generateId(): ProductionLineId {
  // Base 62 characters
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let autoId = "";
  for (let i = 0; i < 6; i++) {
    autoId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return autoId;
}

interface ProductionLineMetaData {
  id: ProductionLineId;
  title: string;
  icon: string;
  /** Description */
  desc: string;
  /** Last modified date (in millis) */
  modi: number;
}

// Meta data is as Map in runtime, but is seriallized into a array for storage.

export function getProdctionLineMetaDatas(): ProductionLineMetaData[] {
  const metaDatas = localStorage.getItem("productionLineMetaDatas");
  if (metaDatas === null) return [];
  const parsedData = JSON.parse(metaDatas);
  if (!Array.isArray(parsedData)) return [];
  return parsedData;
}

export function setProductionLineMetaDatas(metaDatas: ProductionLineMetaData) {
  localStorage.setItem("productionLineMetaDatas", JSON.stringify(metaDatas));
}
