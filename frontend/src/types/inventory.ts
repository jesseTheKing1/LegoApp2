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
  catalog_item_id: number;
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