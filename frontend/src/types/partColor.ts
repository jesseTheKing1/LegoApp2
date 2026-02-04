// src/types/partColor.ts
import type { Part } from "./part";
import type { Color } from "./color";
import type { CatalogItemMini } from "./catalog"; // ✅ I recommend naming this file catalogItem.ts

export interface PartColor {
  id: number;
  part_color_code: string;
  variant?: string;
  description?: string;
  image_url_1?: string;
  image_url_2?: string;
  part: Part;
  color: Color;
  catalog_item?: CatalogItemMini | null;
}

export interface PartColorPayload {
  part_id: number;
  color_id: number;
  part_color_code: string;
  variant?: string;
  description?: string;
  image_url_1?: string;
  image_url_2?: string;
  catalog_item_id?: number | null;
}

export interface PartColorRow {
  id: number;
  part_color_code: string;
  variant?: string;
  description?: string;
  image_url_1?: string;
  image_url_2?: string;
  thumb_url?: string;

  part?: Part;
  color?: Color;

  part_id?: number;
  color_id?: number;

  catalog_item?: CatalogItemMini | null;
  catalog_item_id?: number | null;
}
