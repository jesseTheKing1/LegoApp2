// frontend/src/api/endpoints.ts
export const ENDPOINTS = {
  token: "/api/auth/token/",
  refresh: "/api/auth/token/refresh/",
  me: "/api/auth/me/",
  register: "/api/auth/register/", // we'll add this later on backend

  colors: "/api/parts/colors/",
  parts: "/api/parts/parts/",
  partColors: "/api/parts/part-colors/",

  catalog:"/api/catalog/catalog-items/",

  presignUpload: "/api/upload/presign/",
};
