import "server-only";
import { adminDb } from "@/lib/firebase/admin";

const PUA_HIGH = String.fromCharCode(0xf8ff);

/**
 * Sinh số chứng từ dạng "NK-2026-00001" (prefix-năm-số thứ tự 5 chữ số).
 * Vì doc id chính là soChungTu, .create() ở nơi gọi sẽ throw ALREADY_EXISTS
 * nếu 2 request tạo phiếu cùng lúc trùng số — nơi gọi nên retry 1-2 lần khi
 * gặp lỗi đó (xác suất thấp với quy mô nội bộ 1 công ty, nhưng vẫn có thể).
 */
export async function generateSoChungTu(collectionName: string, prefix: string): Promise<string> {
  const year = new Date().getUTCFullYear();
  const yearPrefix = `${prefix}-${year}-`;
  // PUA_HIGH là code point rất cao, dùng theo convention của Firestore để mô
  // phỏng prefix match (">= yearPrefix" AND "< yearPrefix + ký tự rất cao").
  const upperBound = `${yearPrefix}${PUA_HIGH}`;

  const snap = await adminDb
    .collection(collectionName)
    .where("soChungTu", ">=", yearPrefix)
    .where("soChungTu", "<", upperBound)
    .orderBy("soChungTu", "desc")
    .limit(1)
    .get();

  let num = 1;
  if (!snap.empty) {
    const last = (snap.docs[0].data().soChungTu as string) || "";
    const parts = last.split("-");
    const parsed = parseInt(parts[parts.length - 1], 10);
    num = Number.isFinite(parsed) ? parsed + 1 : 1;
  }

  return `${yearPrefix}${String(num).padStart(5, "0")}`;
}
