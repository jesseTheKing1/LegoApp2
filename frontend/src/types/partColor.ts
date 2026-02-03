import type { Part } from "./part";
import type { Color } from "./color";

/* ---------------- READ MODEL ---------------- */
/* What the API returns */
export interface PartColor {
  id: number;
  part_color_code: string;
  variant?: string;
  description?: string;
  image_url_1?: string;
  image_url_2?: string;

  part: Part;
  color: Color;
}

/* ---------------- WRITE MODEL ---------------- */
/* What the API expects */
export interface PartColorPayload {
  part_id: number;
  color_id: number;
  part_color_code: string;

  variant?: string;
  description?: string;
  image_url_1?: string;
  image_url_2?: string;
}
