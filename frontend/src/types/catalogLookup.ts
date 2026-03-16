export type CatalogLookupItem = {
  id: number;
  sku: string;
  product_type: "minifig" | "part_color" | "catalog";
  display_name: string;
  subtitle: string;
  display_image_url?: string;
  current_price?: string | number | null;
  pricing_source?: string;
  is_active: boolean;
};