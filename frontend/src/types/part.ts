export interface Part {
  id: number;
  part_id: string;
  name: string;

  // from PartSerializer
  general_category: string;
  specific_category: string;
  actual_category: string;

  image_url?: string | null;
}
