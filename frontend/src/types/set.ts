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
  theme?: Theme | null;
  catalog_item?: CatalogItemMini | null;
  parts: SetPart[];
  minifigs: SetMinifig[];
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
  theme_id?: number | null;
  catalog_item_id?: number | null;
  parts: SetPartPayload[];
  minifigs: SetMinifigPayload[];
};
