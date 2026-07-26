import { NextRequest, NextResponse } from "next/server";
import type { Query } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/apiError";
import { getKhoDisplay } from "@/lib/server/khoLookup";
import type { TonKho, HangHoa } from "@/lib/types/warehouse";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    const search = sp.get("search")?.toLowerCase().trim() || null;
    const khoId = sp.get("kho_id") || null;
    const nhomHang = sp.get("nhom_hang") || null;
    const page = Math.max(1, Number(sp.get("page") || 1));
    const limit = Math.min(200, Math.max(1, Number(sp.get("limit") || 50)));

    let query: Query = adminDb.collection("warehouse_ton_kho");
    if (khoId) query = query.where("khoId", "==", khoId);
    const snap = await query.orderBy("updatedAt", "desc").get();
    const rows = snap.docs.map((d) => d.data() as TonKho);

    const hangHoaIds = [...new Set(rows.map((r) => r.hangHoaId))];
    const hangHoaDocs = await Promise.all(hangHoaIds.map((id) => adminDb.collection("warehouse_hang_hoa").doc(id).get()));
    const hangHoaMap = new Map(hangHoaDocs.filter((d) => d.exists).map((d) => [d.id, d.data() as HangHoa]));

    const khoIds = [...new Set(rows.map((r) => r.khoId))];
    const khoDisplays = await Promise.all(khoIds.map(async (id) => [id, await getKhoDisplay(id)] as const));
    const khoMap = new Map(khoDisplays);

    let items = rows.map((r) => ({
      ...r,
      hangHoa: hangHoaMap.get(r.hangHoaId) ?? null,
      kho: khoMap.get(r.khoId) ?? null,
    }));

    if (search) {
      items = items.filter(
        (i) =>
          (i.hangHoa?.maHang || "").toLowerCase().includes(search) ||
          (i.hangHoa?.tenHang || "").toLowerCase().includes(search)
      );
    }
    if (nhomHang) {
      items = items.filter((i) => i.hangHoa?.nhomHang === nhomHang);
    }

    const total = items.length;
    const offset = (page - 1) * limit;
    const pageItems = items.slice(offset, offset + limit);

    return NextResponse.json({ items: pageItems, total, page, limit });
  } catch (e) {
    return handleApiError(e);
  }
}
