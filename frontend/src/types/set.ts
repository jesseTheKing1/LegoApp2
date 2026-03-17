import type { CatalogItemMini } from "./catalog";
import type { Theme, Minifig } from "./minifig";
import type { PartColor } from "./partColor";

export type SetPart = {
  id: number;
  part_color: PartColor;
  quantity: number;
  instruction_page: number | null;
  sort_order: number;
  bag_number?: string;
  is_visible: boolean;
  is_structural: boolean;
  notes: string;
};

export type SetMinifig = {
  id: number;
  minifig: Pick<Minifig, "id" | "bricklink_id" | "name" | "image_url">;
  quantity: number;
  sort_order: number;
  bag_number?: string;
  notes: string;
};

export type LegoSet = {
  id: number;
  set_num: string;
  name: string;
  image_url?: string;
  official_piece_count: number;
  theme?: Theme | null;
  catalog_item?: CatalogItemMini | null;

  parts?: SetPart[];
  minifigs?: SetMinifig[];

  created_at?: string;
  updated_at?: string;
};

export type SetPartPayload = {
  part_color_id: number;
  quantity: number;
  instruction_page?: number | null;
  sort_order: number;
  bag_number?: string;
  is_visible: boolean;
  is_structural: boolean;
  notes?: string;
};

export type SetMinifigPayload = {
  minifig_id: number;
  quantity: number;
  sort_order: number;
  bag_number?: string;
  notes?: string;
};

export type SetPayload = {
  set_num: string;
  name: string;
  image_url?: string;
  official_piece_count?: number;
  theme_id?: number | null;
  catalog_item_id?: number | null;
  create_catalog_item?: boolean;
  base_price_override?: string | null;

  parts?: SetPartPayload[];
  minifigs?: SetMinifigPayload[];
};