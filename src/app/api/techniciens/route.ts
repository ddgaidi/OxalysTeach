import { NextRequest, NextResponse } from "next/server";
import { fetchTechniciansByFablabId } from "@/src/lib/fetchTechnicians";

export async function GET(req: NextRequest) {
  const fablabId = req.nextUrl.searchParams.get("fablabId");

  if (!fablabId) {
    return NextResponse.json({ error: "fablabId manquant" }, { status: 400 });
  }

  const technicians = await fetchTechniciansByFablabId(fablabId);

  return NextResponse.json({ technicians });
}
