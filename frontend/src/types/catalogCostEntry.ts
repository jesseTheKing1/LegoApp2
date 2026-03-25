export type CatalogCostSource =
  | "lego"
  | "bricklink"
  | "brickowl"
  | "ebay"
  | "local"
  | "other";

export interface CatalogCostEntry {
  id: number;
  catalog_item: number;

  source: CatalogCostSource;
  supplier_name: string;

  quantity: number;
  unit_cost: string;

  shipping_cost: string;
  tax_cost: string;
  other_cost: string;

  purchased_at: string;
  reference: string;
  notes: string;

  subtotal: string;
  total_cost: string;
  landed_unit_cost: string;

  created_at: string;
  updated_at: string;
}

export interface CatalogCostEntryPayload {
  catalog_item: number;
  source: CatalogCostSource;
  supplier_name?: string;

  quantity: number;
  unit_cost: string;

  shipping_cost?: string;
  tax_cost?: string;
  other_cost?: string;

  purchased_at: string;
  reference?: string;
  notes?: string;
}