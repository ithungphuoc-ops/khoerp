import { NextRequest, NextResponse } from "next/server";
import { FieldPath } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireManager } from "@/lib/server/permissions";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import type { PhongBan } from "@/lib/types/warehouse";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    const search = sp.get("search")?.toLowerCase().trim() || null;

    const snap = await adminDb
      .collection("warehouse_phong_ban")
      .where("active", "==", true)
      .orderBy(FieldPath.documentId())
      .get();
    let items = snap.docs.map((d) => d.data() as PhongBan);

    if (search) {
      items = items.filter((p) => p.ma.toLowerCase().includes(search) || p.ten.toLowerCase().includes(search));
    }

    return NextResponse.json({ items });
  } catch (e) {
    return handleApiError(e);
  }
}

interface PhongBanCreateBody {
  ma: string;
  ten: string;
  mo_ta?: string;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    requireManager(user, "Không có quyền tạo phòng ban");
    const body = (await req.json()) as PhongBanCreateBody;
    if (!body.ma || !body.ten) throw new ApiError(400, "Thiếu mã hoặc tên phòng ban");

    const data: PhongBan = {
      ma: body.ma,
      ten: body.ten,
      moTa: body.mo_ta,
      active: true,
      createdAt: new Date().toISOString(),
    };

    try {
      await adminDb.collection("warehouse_phong_ban").doc(body.ma).create(data);
    } catch (e: unknown) {
      const code = (e as { code?: number })?.code;
      if (code === 6) throw new ApiError(400, `Mã phòng ban "${body.ma}" đã tồn tại`);
      throw new ApiError(400, `Lỗi tạo phòng ban: ${e instanceof Error ? e.message : String(e)}`);
    }

    return NextResponse.json(data);
  } catch (e) {
    return handleApiError(e);
  }
}
