import type { CatalogItemMini } from "./catalog";
import type { Theme, Minifig } from "./minifig";
import type { PartColor } from "./partColor";

export type ColorMatchMode = "exact" | "any_color";

export type SetPart = {
  id: number;
  part_color: number;
  part_color_detail: PartColor;
  quantity: number;
  instruction_page: number | null;
  sort_order: number;
  bag_number: string;
  step_number: number | null;
  is_visible: boolean;
  is_structural: boolean;
  color_match_mode: ColorMatchMode;
  notes: string;
  unit_price?: string | null;
  line_total?: string | null;
  owned_quantity?: number;
  missing_quantity?: number;
  missing_line_total?: string | null;
  collection_sources?: Array<{
    type: "set" | "loose";
    id: number;
    set_num?: string;
    name: string;
    image_url?: string;
    available: number;
    quantity: number;
  }>;
};

export type SetMinifig = {
  id: number;
  minifig: number;
  minifig_detail: Pick<Minifig, "id" | "bricklink_id" | "name" | "image_url">;
  quantity: number;
  sort_order: number;
  bag_number: string;
  is_required: boolean;
  notes: string;
};

export type LegoSet = {
  id: number;
  set_num: string;
  name: string;
  image_url?: string;
  official_piece_count: number;
  year_released?: number | null;
  theme?: Theme | null;
  catalog_item?: CatalogItemMini | null;
  parts: SetPart[];
  minifigs: SetMinifig[];
  parts_total_price?: string;
  missing_parts_price?: string;
  inventory_savings?: string;
  priced_part_quantity?: number;
  collection_sources?: Array<{
    type: "set" | "loose";
    id: number;
    set_num?: string;
    name: string;
    image_url?: string;
    piece_count: number;
  }>;
  is_in_collection?: boolean;
  collection_set_locked?: boolean;
};

export type SetPartPayload = {
  part_color_id: number;
  quantity: number;
  instruction_page: number | null;
  sort_order: number;
  bag_number: string;
  step_number?: number | null;
  is_visible: boolean;
  is_structural: boolean;
  color_match_mode: ColorMatchMode;
  notes: string;
};

export type SetMinifigPayload = {
  minifig_id: number;
  quantity: number;
  sort_order: number;
  bag_number: string;
  is_required: boolean;
  notes: string;
};

export type SetPayload = {
  set_num: string;
  name: string;
  image_url?: string;
  official_piece_count: number;
  year_released?: number | null;
  theme_id?: number | null;
  catalog_item_id?: number | null;
  parts: SetPartPayload[];
  minifigs: SetMinifigPayload[];
};
