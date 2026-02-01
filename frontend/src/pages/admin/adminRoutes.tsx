import React from "react";
import ColorsAdminPage from "./page/ColorsAdminPage";
import PartColorsPage from "./page/PartColorsPage";

/**
 * One source of truth:
 * - sidebar items
 * - route config
 */
export type AdminRoute = {
  key: string;
  label: string;
  path: string; // relative to /admin
  element: React.ReactNode;
  group?: string;
};

export const ADMIN_ROUTES: AdminRoute[] = [
  {
    key: "part-colors",
    label: "Part Colors",
    path: "part-colors",
    element: <PartColorsPage />,
    group: "Catalog",
  },
  {
    key: "colors",
    label: "Colors",
    path: "colors",
    element: <ColorsAdminPage />,
    group: "Catalog",
  },
];
