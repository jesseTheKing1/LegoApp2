// frontend/src/api/endpoints.ts
export const ENDPOINTS = {
  token: "/api/auth/token/",
  refresh: "/api/auth/token/refresh/",
  me: "/api/auth/me/",
  register: "/api/auth/register/", // we'll add this later on backend

  colors: "/api/parts/colors/",
  parts: "/api/parts/parts/",
  partColors: "/api/parts/part-colors/",

  minifigs: "/api/minifigs/",
  themes: "/api/themes/",
  
  catalog:"/api/catalog/catalog-items/",
  catalogLookup: "/api/catalog/catalog-items/lookup/",

  sets: "/api/sets/",
  
  inventoryDashboard: "/api/inventory/dashboard/",
  inventoryLocations: "/api/inventory/locations/",
  inventoryRecords: "/api/inventory/records/",

  presignUpload: "/api/upload/presign/",
};
