import { NextRequest, NextResponse } from "next/server";
import { FieldPath } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireManager } from "@/lib/server/permissions";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import type { NhaCungCap } from "@/lib/types/purchasing";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    const search = sp.get("search")?.toLowerCase().trim() || null;

    const snap = await adminDb
      .collection("purchasing_ncc")
      .where("active", "==", true)
      .orderBy(FieldPath.documentId())
      .get();
    let items = snap.docs.map((d) => d.data() as NhaCungCap);

    if (search) {
      items = items.filter((n) => n.ma.toLowerCase().includes(search) || n.ten.toLowerCase().includes(search));
    }

    return NextResponse.json({ items });
  } catch (e) {
    return handleApiError(e);
  }
}

interface NhaCungCapCreateBody {
  ma: string;
  ten: string;
  dia_chi?: string;
  ma_so_thue?: string;
  nguoi_lien_he?: string;
  sdt?: string;
  email?: string;
  so_tai_khoan_ngan_hang?: string;
  so_ngay_duoc_no?: number;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    requireManager(user, "Không có quyền tạo nhà cung cấp");
    const body = (await req.json()) as NhaCungCapCreateBody;
    if (!body.ma || !body.ten) throw new ApiError(400, "Thiếu mã hoặc tên nhà cung cấp");

    const data: NhaCungCap = {
      ma: body.ma,
      ten: body.ten,
      diaChi: body.dia_chi,
      maSoThue: body.ma_so_thue,
      nguoiLienHe: body.nguoi_lien_he,
      sdt: body.sdt,
      email: body.email,
      soTaiKhoanNganHang: body.so_tai_khoan_ngan_hang,
      soNgayDuocNo: body.so_ngay_duoc_no,
      active: true,
      createdAt: new Date().toISOString(),
    };

    try {
      await adminDb.collection("purchasing_ncc").doc(body.ma).create(data);
    } catch (e: unknown) {
      const code = (e as { code?: number })?.code;
      if (code === 6) throw new ApiError(400, `Nhà cung cấp "${body.ma}" đã tồn tại`);
      throw new ApiError(400, `Lỗi tạo nhà cung cấp: ${e instanceof Error ? e.message : String(e)}`);
    }

    return NextResponse.json(data);
  } catch (e) {
    return handleApiError(e);
  }
}
