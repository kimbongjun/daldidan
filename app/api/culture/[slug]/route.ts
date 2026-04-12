import { NextResponse } from "next/server";
import { getCultureDetail } from "@/lib/data/culture";

export async function GET(_: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const detail = await getCultureDetail(slug);

  if (!detail) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
