import { createClient } from "@/lib/supabase/server";

export interface PriceEntry {
  type: string;
  price: string;
  note: string;
}

export interface InspectionRecord {
  id: string;
  user_id: string;
  complex_name: string;
  dong_ho: string | null;
  address: string | null;
  pyeong: string | null;
  year_built: number | null;
  total_units: number | null;
  parking_count: string | null;
  structure: string | null;
  subway_access: string | null;
  major_transport: string | null;
  terrain: string | null;
  harmful_facilities: string | null;
  school_zone: string | null;
  amenities: string | null;
  nature_env: string | null;
  building_gap: string | null;
  community: string | null;
  maintenance: string | null;
  interior_condition: string | null;
  price_info: PriceEntry[];
  review: string | null;
  image_urls: string[];
  created_at: string;
  updated_at: string | null;
}

export async function getInspectionRecords(): Promise<InspectionRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspection_records")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as InspectionRecord[];
}

export async function getInspectionRecord(id: string): Promise<InspectionRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspection_records")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as InspectionRecord | null;
}
