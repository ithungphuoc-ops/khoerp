import { NextRequest, NextResponse } from "next/server";
import { FieldPath } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireManager } from "@/lib/server/permissions";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import type { TaiKhoanKeToan } from "@/lib/types/warehouse";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    const search = sp.get("search")?.toLowerCase().trim() || null;

    const snap = await adminDb
      .collection("warehouse_tai_khoan")
      .where("active", "==", true)
      .orderBy(FieldPath.documentId())
      .get();
    let items = snap.docs.map((d) => d.data() as TaiKhoanKeToan);

    if (search) {
      items = items.filter((t) => t.ma.toLowerCase().includes(search) || t.ten.toLowerCase().includes(search));
    }

    return NextResponse.json({ items });
  } catch (e) {
    return handleApiError(e);
  }
}

interface TaiKhoanCreateBody {
  ma: string;
  ten: string;
  mo_ta?: string;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    requireManager(user, "Không có quyền tạo tài khoản kế toán");
    const body = (await req.json()) as TaiKhoanCreateBody;
    if (!body.ma || !body.ten) throw new ApiError(400, "Thiếu mã hoặc tên tài khoản");

    const data: TaiKhoanKeToan = {
      ma: body.ma,
      ten: body.ten,
      moTa: body.mo_ta,
      active: true,
      createdAt: new Date().toISOString(),
    };

    try {
      await adminDb.collection("warehouse_tai_khoan").doc(body.ma).create(data);
    } catch (e: unknown) {
      const code = (e as { code?: number })?.code;
      if (code === 6) throw new ApiError(400, `Tài khoản "${body.ma}" đã tồn tại`);
      throw new ApiError(400, `Lỗi tạo tài khoản: ${e instanceof Error ? e.message : String(e)}`);
    }

    return NextResponse.json(data);
  } catch (e) {
    return handleApiError(e);
  }
}
