import type { CatalogItemMini } from "./catalog";
import type { PartColor } from "./partColor";

export type Theme = {
  id: number;
  name: string;
  image_url?: string;
};

export type MinifigIngredient = {
  id?: number;
  part_color: PartColor;
  quantity: number;
  role:
    | "head"
    | "hair"
    | "hat"
    | "helmet"
    | "torso"
    | "legs"
    | "headgear"
    | "accessory"
    | "weapon"
    | "cape"
    | "body"
    | "other";
  is_required: boolean;
  sort_order: number;
  notes?: string;
};

export type MinifigIngredientPayload = {
  part_color_id: number;
  quantity: number;
  role:
    | "head"
    | "hair"
    | "hat"
    | "helmet"
    | "torso"
    | "legs"
    | "headgear"
    | "accessory"
    | "weapon"
    | "cape"
    | "body"
    | "other";
  is_required: boolean;
  sort_order: number;
  notes?: string;
};

export type Minifig = {
  id: number;
  bricklink_id: string;
  name: string;
  image_url?: string;
  theme?: Theme | null;
  catalog_item?: CatalogItemMini | null;
  ingredients?: MinifigIngredient[];
};

export type MinifigPayload = {
  bricklink_id: string;
  name: string;
  image_url?: string;
  theme_id?: number | null;
  catalog_item_id?: number | null;
  create_catalog_item?: boolean;
  base_price_override?: string | number | null;
  ingredients?: MinifigIngredientPayload[];
};