import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const revalidate = 0;

export type DdayProfile = {
  id: string;
  display_name: string | null;
  birth_month: number | null;
  birth_day: number | null;
};

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id, display_name, birth_month, birth_day")
      .not("display_name", "is", null);

    if (error) return NextResponse.json([] as DdayProfile[]);
    return NextResponse.json((data ?? []) as DdayProfile[]);
  } catch {
    return NextResponse.json([] as DdayProfile[]);
  }
}
