export type LibraryPickerType = "part_color" | "minifig" | "set" | "catalog";
export type LibraryPickerMode = "all" | "part_color" | "minifig" | "set" | "catalog";

export interface LibraryPickerResult {
  id: number;
  type: LibraryPickerType;
  title: string;
  subtitle: string;
  image_url?: string | null;
  search_text: string;
  meta?: {
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

    current_price?: string | null;
    current_cost?: string | null;
    pricing_source?: string | null;
  };
}