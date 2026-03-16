import type { CatalogItemMini } from "./catalog";
import type { Theme, Minifig } from "./minifig";
import type { PartColor } from "./partColor";

export type SetPartRequirement = {
  id: number;
  part_color: PartColor;
  quantity: number;
  instruction_page: number | null;
  sort_order: number;
  is_visible: boolean;
  is_structural: boolean;
  is_exact_color_required: boolean;
  is_required: boolean;
  notes: string;
};

export type SetMinifigRequirement = {
  id: number;
  minifig: Pick<Minifig, "id" | "bricklink_id" | "name" | "image_url">;
  quantity: number;
  sort_order: number;
  is_required: boolean;
  is_exact_required: boolean;
  notes: string;
};

export type LegoSet = {
  id: number;
  set_num: string;
  name: string;
  image_url?: string;
  piece_count: number;
  theme?: Theme | null;
  catalog_item?: CatalogItemMini | null;
  part_requirements?: SetPartRequirement[];
  minifig_requirements?: SetMinifigRequirement[];
  created_at?: string;
  updated_at?: string;
};

export type SetPartRequirementPayload = {
  part_color_id: number;
  quantity: number;
  instruction_page?: number | null;
  sort_order: number;
  is_visible: boolean;
  is_structural: boolean;
  is_exact_color_required: boolean;
  is_required: boolean;
  notes?: string;
};

export type SetMinifigRequirementPayload = {
  minifig_id: number;
  quantity: number;
  sort_order: number;
  is_required: boolean;
  is_exact_required: boolean;
  notes?: string;
};

export type SetPayload = {
  set_num: string;
  name: string;
  image_url?: string;
  piece_count?: number;
  theme_id?: number | null;
  catalog_item_id?: number | null;
  create_catalog_item?: boolean;
  base_price_override?: string | null;
  part_requirements?: SetPartRequirementPayload[];
  minifig_requirements?: SetMinifigRequirementPayload[];
};