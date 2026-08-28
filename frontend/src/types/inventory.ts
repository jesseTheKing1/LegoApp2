export type LocationType =
  | "warehouse"
  | "room"
  | "shelf"
  | "bin"
  | "drawer"
  | "tote"
  | "other";

export interface LocationRow {
  id: number;
  name: string;
  code: string;
  location_type: LocationType;
  parent: number | null;
  parent_name?: string;
  parent_code?: string;
  notes: string;
  is_active: boolean;
}

export interface LocationPayload {
  name: string;
  code: string;
  location_type?: LocationType;
  parent?: number | null;
  notes?: string;
  is_active?: boolean;
}

export type InventoryCondition =
  | "sealed"
  | "complete"
  | "loose"
  | "incomplete"
  | "damaged";

export type InventorySourceType =
  | "lego"
  | "bricklink"
  | "ebay"
  | "thrift"
  | "trade"
  | "personal"
  | "other";

export interface InventoryRecordRow {
  id: number;

  catalog_item: {
    id: number;
    sku: string;
    is_active: boolean;
    base_price_override: string | null;
    force_override: boolean;
    current_price?: string | null;
    pricing_source?: string;
    notes: string;
  };

  location: LocationRow;

  condition: InventoryCondition;
  source_type: InventorySourceType;

  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;

  unit_cost: string | null;
  total_cost: string | null;
  total_available_cost: string | null;

  acquired_at: string | null;
  notes: string;

  is_sellable: boolean;
  is_active: boolean;

  created_at: string;
  updated_at: string;
}

export interface InventoryRecordPayload {
  catalog_item_id?: number;
  location_id: number;

  condition?: InventoryCondition;
  source_type?: InventorySourceType;

  quantity_on_hand: number;
  quantity_reserved?: number;

  unit_cost?: string | null;
  acquired_at?: string | null;
  notes?: string;

  is_sellable?: boolean;
  is_active?: boolean;
}

export interface InventoryDashboardConditionRow {
  condition: string;
  count: number;
  quantity: number;
}

export interface InventoryDashboardLocationRow {
  location__id: number;
  location__name: string;
  location__code: string;
  count: number;
  quantity: number;
}

export interface InventoryDashboard {
  summary: {
    total_units: number;
    total_reserved: number;
    total_available: number;
    active_skus: number;
    total_cost: string | number;
    total_available_cost: string | number;
    bricklink_reference_value: string | number;
    current_sell_value: string | number;
    sellable_available_units: number;
  };
  by_condition: InventoryDashboardConditionRow[];
  by_location: InventoryDashboardLocationRow[];
  product_type_counts: {
    sets: number;
    minifigs: number;
    part_colors: number;
  };
  pricing_items: InventoryPricingItem[];
}

export interface InventoryPricingItem {
  catalog_item_id: number;
  sku: string;
  product_type: "set" | "minifig" | "part" | "catalog";
  name: string;
  subtitle: string;
  image_url: string;
  quantity_available: number;
  bricklink_reference_price: string | null;
  current_price: string | null;
  reference_total: string | null;
  current_total: string | null;
}

/* ------------------------------------------------------------------ */
/* backwards-compatible aliases so old pages keep compiling            */
/* ------------------------------------------------------------------ */

export type InventoryLocation = LocationRow;
export type InventoryLocationPayload = LocationPayload;
export type InventoryRecord = InventoryRecordRow;
