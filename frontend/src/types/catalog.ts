import type { CatalogCostEntry } from "./catalogCostEntry";

export interface CatalogItem {
  id: number;
  sku: string;
  is_active: boolean;

  base_price_override: string | null;
  force_override: boolean;

  lego_reference_price: string | null;
  bricklink_reference_price: string | null;

  current_price: string | null;
  pricing_source: string;

  latest_landed_unit_cost: string | null;
  weighted_average_unit_cost: string | null;
  current_cost: string | null;
  margin_amount: string | null;
  margin_percent: string | null;
  lego_vs_bricklink_diff_percent: string | null;
  total_units_purchased: number;
  total_spent: string | null;

  notes: string;
  cost_entries?: CatalogCostEntry[];

  created_at: string;
  updated_at: string;
}

export interface CatalogItemPayload {
  sku: string;
  is_active?: boolean;

  // sell pricing
  base_price_override?: string | null;
  force_override?: boolean;

  // reference pricing
  lego_reference_price?: string | null;
  bricklink_reference_price?: string | null;

  notes?: string;
}

export interface CatalogItemMini {
  id: number;
  sku: string;
  is_active: boolean;

  base_price_override: string | null;
  force_override: boolean;

  lego_reference_price?: string | null;
  bricklink_reference_price?: string | null;

  current_price?: string | null;
  pricing_source?: string;

  current_cost?: string | null;
  margin_amount?: string | null;
  margin_percent?: string | null;

  notes: string;
}