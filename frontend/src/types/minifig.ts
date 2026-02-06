// src/types/minifig.ts
import type { CatalogItemMini } from "./catalog";

export type Theme = { id: number; name: string; image_url?: string };

export type Minifig = {
  id: number;
  bricklink_id: string;
  name: string;
  image_url?: string;
  theme: Theme;
  catalog_item?: CatalogItemMini | null;
};

export type MinifigPayload = {
  bricklink_id: string;
  name: string;
  image_url?: string;
  theme_id: number;
  catalog_item_id?: number | null;

  // optional “create pricing now”
  create_catalog_item?: boolean;
  base_price_override?: string | number | null;
};
