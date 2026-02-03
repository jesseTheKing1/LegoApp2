export interface Color {
  id: number;
  lego_id: number | null;
  name: string;
  hex: string;
  is_transparent: boolean;
  is_metallic: boolean;
}
