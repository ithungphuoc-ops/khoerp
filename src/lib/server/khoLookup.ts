import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import type { Kho } from "@/lib/types/warehouse";

/** Lấy {maKho, tenKho} để hiển thị — khoId truyền vào chính là doc id (= maKho). */
export async function getKhoDisplay(khoId?: string | null): Promise<{ maKho: string; tenKho: string } | null> {
  if (!khoId) return null;
  const snap = await adminDb.collection("warehouse_kho").doc(khoId).get();
  if (!snap.exists) return null;
  const kho = snap.data() as Kho;
  return { maKho: kho.maKho, tenKho: kho.tenKho };
}
