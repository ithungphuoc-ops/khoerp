import { NextRequest, NextResponse } from "next/server";
import { FieldPath } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireManager } from "@/lib/server/permissions";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import type { Kho } from "@/lib/types/warehouse";

export async function GET() {
  try {
    await requireUser();
    const snap = await adminDb
      .collection("warehouse_kho")
      .where("active", "==", true)
      .orderBy(FieldPath.documentId())
      .get();
    const items = snap.docs.map((d) => d.data() as Kho);
    return NextResponse.json({ items });
  } catch (e) {
    return handleApiError(e);
  }
}

interface KhoCreateBody {
  ma_kho: string;
  ten_kho: string;
  dia_chi?: string;
  mo_ta?: string;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    requireManager(user, "Không có quyền tạo kho");
    const body = (await req.json()) as KhoCreateBody;
    if (!body.ma_kho || !body.ten_kho) throw new ApiError(400, "Thiếu mã kho hoặc tên kho");

    const data: Kho = {
      maKho: body.ma_kho,
      tenKho: body.ten_kho,
      diaChi: body.dia_chi,
      moTa: body.mo_ta,
      active: true,
      createdAt: new Date().toISOString(),
    };

    try {
      await adminDb.collection("warehouse_kho").doc(body.ma_kho).create(data);
    } catch (e: unknown) {
      const code = (e as { code?: number })?.code;
      if (code === 6) throw new ApiError(400, `Mã kho "${body.ma_kho}" đã tồn tại`);
      throw new ApiError(400, `Lỗi tạo kho: ${e instanceof Error ? e.message : String(e)}`);
    }

    return NextResponse.json(data);
  } catch (e) {
    return handleApiError(e);
  }
}
