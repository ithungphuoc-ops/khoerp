import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/apiError";
import type { HangHoa } from "@/lib/types/warehouse";

export async function GET() {
  try {
    await requireUser();
    const snap = await adminDb.collection("warehouse_hang_hoa").get();
    const nhom = [...new Set(snap.docs.map((d) => (d.data() as HangHoa).nhomHang).filter(Boolean))].sort();
    return NextResponse.json({ nhom });
  } catch (e) {
    return handleApiError(e);
  }
}
