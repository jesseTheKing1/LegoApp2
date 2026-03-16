import type { CatalogItemMini } from "./catalog";

export type InventoryLocation = {
  id: number;
  name: string;
  code: string;
  location_type:
    | "warehouse"
    | "room"
    | "shelf"
    | "bin"
    | "drawer"
    | "tote"
    | "other";
  parent?: number | null;
  parent_name?: string;
  parent_code?: string;
  notes?: string;
  is_active: boolean;
};

export type InventoryRecord = {
  id: number;
  catalog_item: CatalogItemMini;
  location: InventoryLocation;
  condition: "sealed" | "complete" | "loose" | "incomplete" | "damaged";
  source_type: "lego" | "bricklink" | "ebay" | "thrift" | "trade" | "personal" | "other";
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  unit_cost?: string | number | null;
  total_cost?: string | number | null;
  total_available_cost?: string | number | null;
  acquired_at?: string | null;
  notes?: string;
  is_sellable: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type InventoryRecordPayload = {
  catalog_item_id: number;
  location_id: number;
  condition: "sealed" | "complete" | "loose" | "incomplete" | "damaged";
  source_type: "lego" | "bricklink" | "ebay" | "thrift" | "trade" | "personal" | "other";
  quantity_on_hand: number;
  quantity_reserved: number;
  unit_cost?: string | number | null;
  acquired_at?: string | null;
  notes?: string;
  is_sellable: boolean;
  is_active: boolean;
};

export type InventoryLocationPayload = {
  name: string;
  code: string;
  location_type:
    | "warehouse"
    | "room"
    | "shelf"
    | "bin"
    | "drawer"
    | "tote"
    | "other";
  parent?: number | null;
  notes?: string;
  is_active: boolean;
};

export type InventoryDashboard = {
  summary: {
    total_units: number;
    total_reserved: number;
    total_available: number;
    active_skus: number;
    total_cost: string | number;
    total_available_cost: string | number;
  };
  by_condition: {
    condition: string;
    count: number;
    quantity: number;
  }[];
  by_location: {
    location__id: number;
    location__name: string;
    location__code: string;
    count: number;
    quantity: number;
  }[];
  product_type_counts: {
    sets: number;
    minifigs: number;
    part_colors: number;
  };
};