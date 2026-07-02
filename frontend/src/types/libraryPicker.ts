export type LibraryPickerType = "part_color" | "minifig" | "set" | "catalog";
export type LibraryPickerMode = "all" | "part_color" | "minifig" | "set" | "catalog";

export interface LibraryPickerMeta {
  sku?: string;

  part_color_code?: string;
  part_id?: string;
  part_name?: string;
  general_category?: string;
  specific_category?: string;
  actual_category?: string;
  color_name?: string;
  color_hex?: string;
  variant?: string;
  description?: string;

  bricklink_id?: string;
  theme_name?: string;

  set_num?: string;
  official_piece_count?: number;
  parts_total_price?: string | number | null;
  priced_part_quantity?: number;
  missing_parts_price?: string | number | null;
  inventory_savings?: string | number | null;
  has_inventory_match?: boolean;

  current_price?: string | number | null;
  current_cost?: string | number | null;
  pricing_source?: string | null;
}

export interface LibraryPickerResult {
  id: number;
  type: LibraryPickerType;
  title: string;
  subtitle: string;
  image_url?: string | null;
  search_text: string;
  meta?: LibraryPickerMeta;
}
