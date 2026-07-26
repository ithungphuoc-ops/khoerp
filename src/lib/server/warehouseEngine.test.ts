import { describe, it, expect, beforeAll } from "vitest";
import { adminDb } from "@/lib/firebase/admin";
import {
  postDocumentMovements,
  postTransferMovements,
  rollbackDocument,
  checkStock,
} from "@/lib/server/warehouseEngine";
import type { TonKho, WarehouseLedgerEntry } from "@/lib/types/warehouse";

// Test này BẮT BUỘC chạy qua `npm run test:emulator` (bọc bởi
// `firebase emulators:exec`, tự set FIRESTORE_EMULATOR_HOST). Chạy `npm run
// test` suông (không có emulator) sẽ throw vì admin.ts đòi
// FIREBASE_SERVICE_ACCOUNT_KEY thật.
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    "warehouseEngine.test.ts cần chạy qua `npm run test:emulator` (Firebase Emulator), không chạy `vitest run` trực tiếp."
  );
}

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function getTonKho(khoId: string, hangHoaId: string): Promise<number> {
  const snap = await adminDb.collection("warehouse_ton_kho").doc(`${khoId}_${hangHoaId}`).get();
  return snap.exists ? (snap.data() as TonKho).soLuong : 0;
}

async function getLedger(refType: string, refId: string): Promise<WarehouseLedgerEntry[]> {
  const snap = await adminDb
    .collection("warehouse_ledger")
    .where("refType", "==", refType)
    .where("refId", "==", refId)
    .orderBy("createdAt", "asc")
    .get();
  return snap.docs.map((d) => d.data() as WarehouseLedgerEntry);
}

describe("WarehouseEngine (Firestore Emulator)", () => {
  beforeAll(async () => {
    expect(await checkStock("khong-ton-tai", "khong-ton-tai")).toBe(0);
  });

  it("postDocumentMovements: nhập kho tăng tồn kho đúng và ghi ledger đúng stockBefore/After", async () => {
    const kho = uniqueId("kho");
    const hh = uniqueId("hh");
    const refId = uniqueId("NK");

    const result = await postDocumentMovements({
      chiTiet: [{ hangHoaId: hh, maHang: hh, tenHang: "Hàng test", soLuong: 10, donGia: 100 }],
      refType: "nhap_kho",
      refId,
      khoId: kho,
      direction: 1,
      transactionType: "IMPORT",
      userId: "user-1",
    });

    expect(result.count).toBe(1);
    expect(await getTonKho(kho, hh)).toBe(10);

    const ledger = await getLedger("nhap_kho", refId);
    expect(ledger).toHaveLength(1);
    expect(ledger[0].stockBefore).toBe(0);
    expect(ledger[0].stockAfter).toBe(10);
    expect(ledger[0].thanhTien).toBe(1000);

    // Nhập thêm lần 2 — phải cộng dồn lên tồn kho hiện có, không ghi đè.
    const refId2 = uniqueId("NK");
    await postDocumentMovements({
      chiTiet: [{ hangHoaId: hh, maHang: hh, soLuong: 5, donGia: 100 }],
      refType: "nhap_kho",
      refId: refId2,
      khoId: kho,
      direction: 1,
      transactionType: "IMPORT",
      userId: "user-1",
    });
    expect(await getTonKho(kho, hh)).toBe(15);
  });

  it("postDocumentMovements: nhiều dòng cùng 1 hàng hóa trong 1 phiếu phải cộng dồn tuần tự đúng", async () => {
    const kho = uniqueId("kho");
    const hh = uniqueId("hh");
    const refId = uniqueId("NK");

    await postDocumentMovements({
      chiTiet: [
        { hangHoaId: hh, maHang: hh, soLuong: 3, donGia: 10 },
        { hangHoaId: hh, maHang: hh, soLuong: 2, donGia: 10 },
      ],
      refType: "nhap_kho",
      refId,
      khoId: kho,
      direction: 1,
      transactionType: "IMPORT",
      userId: "user-1",
    });

    expect(await getTonKho(kho, hh)).toBe(5);
    const ledger = await getLedger("nhap_kho", refId);
    expect(ledger).toHaveLength(2);
    expect(ledger[0].stockBefore).toBe(0);
    expect(ledger[0].stockAfter).toBe(3);
    expect(ledger[1].stockBefore).toBe(3);
    expect(ledger[1].stockAfter).toBe(5);
  });

  it("postDocumentMovements: xuất kho (direction=-1) giảm tồn kho đúng", async () => {
    const kho = uniqueId("kho");
    const hh = uniqueId("hh");

    await postDocumentMovements({
      chiTiet: [{ hangHoaId: hh, maHang: hh, soLuong: 20, donGia: 50 }],
      refType: "nhap_kho",
      refId: uniqueId("NK"),
      khoId: kho,
      direction: 1,
      transactionType: "IMPORT",
      userId: "user-1",
    });
    expect(await getTonKho(kho, hh)).toBe(20);

    await postDocumentMovements({
      chiTiet: [{ hangHoaId: hh, maHang: hh, soLuong: 8, donGia: 50 }],
      refType: "xuat_kho",
      refId: uniqueId("XK"),
      khoId: kho,
      direction: -1,
      transactionType: "EXPORT",
      userId: "user-1",
    });
    expect(await getTonKho(kho, hh)).toBe(12);
  });

  it("postTransferMovements: chuyển kho cập nhật CẢ HAI kho trong cùng 1 transaction", async () => {
    const khoXuat = uniqueId("kho-xuat");
    const khoNhap = uniqueId("kho-nhap");
    const hh = uniqueId("hh");

    await postDocumentMovements({
      chiTiet: [{ hangHoaId: hh, maHang: hh, soLuong: 20, donGia: 30 }],
      refType: "nhap_kho",
      refId: uniqueId("NK"),
      khoId: khoXuat,
      direction: 1,
      transactionType: "IMPORT",
      userId: "user-1",
    });

    const refId = uniqueId("CK");
    await postTransferMovements({
      chiTiet: [{ hangHoaId: hh, maHang: hh, soLuong: 8, donGia: 30 }],
      refId,
      khoXuatId: khoXuat,
      khoNhapId: khoNhap,
      userId: "user-1",
    });

    expect(await getTonKho(khoXuat, hh)).toBe(12);
    expect(await getTonKho(khoNhap, hh)).toBe(8);

    const ledger = await getLedger("chuyen_kho", refId);
    expect(ledger).toHaveLength(2);
    expect(ledger.find((l) => l.transactionType === "TRANSFER_OUT")?.khoId).toBe(khoXuat);
    expect(ledger.find((l) => l.transactionType === "TRANSFER_IN")?.khoId).toBe(khoNhap);
  });

  it("rollbackDocument: hoàn nguyên đúng tồn kho sau khi rollback 1 phiếu nhập", async () => {
    const kho = uniqueId("kho");
    const hh = uniqueId("hh");
    const refId = uniqueId("NK");

    await postDocumentMovements({
      chiTiet: [{ hangHoaId: hh, maHang: hh, soLuong: 10, donGia: 20 }],
      refType: "nhap_kho",
      refId,
      khoId: kho,
      direction: 1,
      transactionType: "IMPORT",
      userId: "user-1",
    });
    expect(await getTonKho(kho, hh)).toBe(10);

    const rolledCount = await rollbackDocument({ refType: "nhap_kho", refId, userId: "user-1" });
    expect(rolledCount).toBe(1);
    expect(await getTonKho(kho, hh)).toBe(0);

    const ledger = await getLedger("nhap_kho", refId);
    expect(ledger).toHaveLength(2); // 1 IMPORT gốc + 1 REVERSAL
    expect(ledger.filter((l) => l.transactionType === "REVERSAL")).toHaveLength(1);
  });

  it("rollbackDocument: hoàn nguyên đúng CẢ HAI kho sau khi rollback 1 phiếu chuyển kho", async () => {
    const khoXuat = uniqueId("kho-xuat");
    const khoNhap = uniqueId("kho-nhap");
    const hh = uniqueId("hh");

    await postDocumentMovements({
      chiTiet: [{ hangHoaId: hh, maHang: hh, soLuong: 20, donGia: 30 }],
      refType: "nhap_kho",
      refId: uniqueId("NK"),
      khoId: khoXuat,
      direction: 1,
      transactionType: "IMPORT",
      userId: "user-1",
    });

    const refId = uniqueId("CK");
    await postTransferMovements({
      chiTiet: [{ hangHoaId: hh, maHang: hh, soLuong: 8, donGia: 30 }],
      refId,
      khoXuatId: khoXuat,
      khoNhapId: khoNhap,
      userId: "user-1",
    });
    expect(await getTonKho(khoXuat, hh)).toBe(12);
    expect(await getTonKho(khoNhap, hh)).toBe(8);

    await rollbackDocument({ refType: "chuyen_kho", refId, userId: "user-1" });
    expect(await getTonKho(khoXuat, hh)).toBe(20);
    expect(await getTonKho(khoNhap, hh)).toBe(0);
  });

  it("2 postDocumentMovements đồng thời trên CÙNG (kho, hàng hóa) không được mất update (lost update)", async () => {
    const kho = uniqueId("kho");
    const hh = uniqueId("hh");

    // 10 lệnh nhập +1 chạy song song vào CÙNG 1 dòng tồn kho — Firestore
    // transaction phải tự retry khi đụng độ, không được có kết quả < 10.
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        postDocumentMovements({
          chiTiet: [{ hangHoaId: hh, maHang: hh, soLuong: 1, donGia: 1 }],
          refType: "nhap_kho",
          refId: uniqueId(`NK-concurrent-${i}`),
          khoId: kho,
          direction: 1,
          transactionType: "IMPORT",
          userId: "user-1",
        })
      )
    );

    expect(await getTonKho(kho, hh)).toBe(10);
  });

  it("checkStock trả về 0 cho cặp (kho, hàng hóa) chưa từng tồn tại", async () => {
    expect(await checkStock(uniqueId("kho"), uniqueId("hh"))).toBe(0);
  });
});
