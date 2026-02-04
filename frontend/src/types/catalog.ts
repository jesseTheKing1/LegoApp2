// src/types/catalogItem.ts

export interface CatalogItem {
  id: number;
  sku: string;
  is_active: boolean;

  // pricing controls
  base_price_override: string | null; // DRF Decimal comes as string
  force_override: boolean;

  notes: string;

  created_at: string;
  updated_at: string;

  // optional if you later add these computed fields
  // current_price?: string | null;
  // pricing_source?: string;
}

export interface CatalogItemPayload {
  sku: string;
  is_active?: boolean;

  base_price_override?: string | null;
  force_override?: boolean;

  notes?: string;
}

/** Small embed version (for PartColor GET responses) */
export interface CatalogItemMini {
  id: number;
  sku: string;
  is_active: boolean;
  base_price_override: string | null;
  force_override: boolean;
  notes: string;
}
