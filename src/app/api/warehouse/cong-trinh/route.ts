import { NextRequest, NextResponse } from "next/server";
import { FieldPath } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireManager } from "@/lib/server/permissions";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import type { CongTrinh } from "@/lib/types/warehouse";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    const search = sp.get("search")?.toLowerCase().trim() || null;

    const snap = await adminDb
      .collection("warehouse_cong_trinh")
      .where("active", "==", true)
      .orderBy(FieldPath.documentId())
      .get();
    let items = snap.docs.map((d) => d.data() as CongTrinh);

    if (search) {
      items = items.filter((c) => c.ma.toLowerCase().includes(search) || c.ten.toLowerCase().includes(search));
    }

    return NextResponse.json({ items });
  } catch (e) {
    return handleApiError(e);
  }
}

interface CongTrinhCreateBody {
  ma: string;
  ten: string;
  dia_diem?: string;
  mo_ta?: string;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    requireManager(user, "Không có quyền tạo công trình");
    const body = (await req.json()) as CongTrinhCreateBody;
    if (!body.ma || !body.ten) throw new ApiError(400, "Thiếu mã hoặc tên công trình");

    const data: CongTrinh = {
      ma: body.ma,
      ten: body.ten,
      diaDiem: body.dia_diem,
      moTa: body.mo_ta,
      active: true,
      createdAt: new Date().toISOString(),
    };

    try {
      await adminDb.collection("warehouse_cong_trinh").doc(body.ma).create(data);
    } catch (e: unknown) {
      const code = (e as { code?: number })?.code;
      if (code === 6) throw new ApiError(400, `Mã công trình "${body.ma}" đã tồn tại`);
      throw new ApiError(400, `Lỗi tạo công trình: ${e instanceof Error ? e.message : String(e)}`);
    }

    return NextResponse.json(data);
  } catch (e) {
    return handleApiError(e);
  }
}
