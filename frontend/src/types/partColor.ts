// src/types/partColor.ts
import type { Part } from "./part";
import type { Color } from "./color";
import type { CatalogItemMini } from "./catalog";

export interface PartColor {
  id: number;

  // nested read-only objects returned by API
  part: Part;
  color: Color;

  // ✅ variant is optional/nullable in practice (backend default is "")
  variant?: string | null;

  part_color_code: string;

  description?: string | null;
  image_url_1?: string | null;
  image_url_2?: string | null;

  // read-only nested catalog info (nullable)
  catalog_item?: CatalogItemMini | null;
}

/**
 * Write payload for POST/PATCH
 * Matches serializer write-only id fields: part_id, color_id, catalog_item_id
 */
export interface PartColorPayload {
  part_id: number; // maps to Part via source="part"
  color_id: number; // maps to Color via source="color"
  variant?: string; // optional; backend default ""
  part_color_code: string;
  description?: string | null;
  image_url_1?: string | null;
  image_url_2?: string | null;

  // attach/detach
  catalog_item_id?: number | null;
}

/**
 * UI row type
 */
export type PartColorRow = PartColor & {
  thumb_url?: string | null;
};
