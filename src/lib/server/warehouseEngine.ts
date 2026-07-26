import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import type {
  HangHoa,
  RefType,
  StockMovementInput,
  TonKho,
  TransactionType,
  WarehouseAuditLog,
  WarehouseLedgerEntry,
  AuditAction,
} from "@/lib/types/warehouse";

/**
 * Warehouse Transaction Engine (bản Firestore)
 * ═══════════════════════════════════════════════════════════════
 * Single source of truth cho toàn bộ thay đổi tồn kho — port từ
 * services/warehouse_engine.py + sql/005_warehouse_engine.sql.
 *
 * QUY TẮC TUYỆT ĐỐI (giữ nguyên từ bản gốc):
 *   - Không được ghi thẳng warehouse_ton_kho từ route.
 *   - Mọi thay đổi tồn kho PHẢI đi qua WarehouseEngine.
 *
 * KHÁC BIỆT QUAN TRỌNG SO VỚI BẢN POSTGRES:
 * Postgres cho phép, trong 1 transaction, SELECT...FOR UPDATE rồi UPDATE
 * một dòng, rồi SELECT lại chính dòng đó (đọc được giá trị mình vừa ghi).
 * Firestore transaction KHÔNG cho phép đọc sau khi đã ghi trong cùng
 * transaction ("all reads before all writes", ở cấp toàn transaction chứ
 * không phải per-document). Vì vậy khi 1 phiếu có nhiều dòng chi tiết cùng
 * một (kho, hàng hóa), engine phải:
 *   1) Đọc số dư hiện tại của MỌI cặp (kho, hàng hóa) liên quan — 1 lần,
 *      trước bất kỳ ghi nào.
 *   2) Mô phỏng tuần tự trong bộ nhớ (không phải Firestore) để tính đúng
 *      stock_before/stock_after cho từng dòng ledger, y hệt thứ tự xử lý
 *      của bản gốc.
 *   3) Ghi số dư cuối cùng của mỗi cặp + toàn bộ ledger entries.
 * Nhờ vậy tính atomic (tất cả hoặc không gì) và độ chính xác ledger từng
 * dòng vẫn được giữ nguyên như bản Postgres.
 */

export class WarehouseEngineError extends Error {}

function tonKhoDocId(khoId: string, hangHoaId: string): string {
  return `${khoId}_${hangHoaId}`;
}

// ── resolveHangHoaId ─────────────────────────────────────────────
interface ChiTietInput {
  hangHoaId?: string;
  maHang?: string;
  tenHang?: string;
  donViTinh?: string;
  soLuong?: number;
  donGia?: number;
  ghiChu?: string;
  tkNo?: string;
  tkCo?: string;
  congTrinh?: string;
}

/**
 * Tìm hangHoaId (= doc id của warehouse_hang_hoa, tức maHang) từ 1 dòng chi
 * tiết. Ưu tiên: hangHoaId có sẵn → maHang → tenHang → tự tạo mới.
 * Chạy TRƯỚC transaction chính (giống bản gốc build_movements chạy ngoài RPC).
 */
export async function resolveHangHoaId(ct: ChiTietInput): Promise<string | null> {
  if (ct.hangHoaId) return ct.hangHoaId;

  const ma = (ct.maHang || "").trim();
  const ten = (ct.tenHang || "").trim();
  if (!ma && !ten) return null;

  if (ma) {
    const snap = await adminDb.collection("warehouse_hang_hoa").doc(ma).get();
    if (snap.exists) return ma;
  }

  if (ten) {
    const q = await adminDb.collection("warehouse_hang_hoa").where("tenHang", "==", ten).limit(1).get();
    if (!q.empty) return q.docs[0].id;
  }

  // Tự tạo hàng hóa mới
  try {
    const newId = ma || ten.slice(0, 20);
    const now = new Date().toISOString();
    const data: HangHoa = {
      maHang: newId,
      tenHang: ten || ma,
      donViTinh: ct.donViTinh || "",
      giaNhap: Number(ct.donGia) || 0,
      giaBan: 0,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    await adminDb.collection("warehouse_hang_hoa").doc(newId).set(data, { merge: true });
    return newId;
  } catch (e) {
    console.error("[WarehouseEngine] resolveHangHoaId auto-create error:", e);
    return null;
  }
}

/** Chuyển danh sách chi_tiết thành movements — bỏ qua dòng thiếu hàng hóa hoặc số lượng <= 0. */
export async function buildMovements(
  chiTiet: ChiTietInput[],
  khoId: string,
  direction: 1 | -1,
  transactionType: TransactionType
): Promise<StockMovementInput[]> {
  const movements: StockMovementInput[] = [];
  for (const ct of chiTiet) {
    const hangHoaId = await resolveHangHoaId(ct);
    if (!hangHoaId) continue;
    const soLuong = Number(ct.soLuong) || 0;
    if (soLuong <= 0) continue;
    movements.push({
      khoId,
      hangHoaId,
      soLuong,
      donGia: Number(ct.donGia) || 0,
      direction,
      transactionType,
      notes: ct.ghiChu,
    });
  }
  return movements;
}

interface PostResult {
  count: number;
  results: Array<{ khoId: string; hangHoaId: string; stockBefore: number; stockAfter: number }>;
}

/**
 * Ghi nhiều movements của 1 phiếu ATOMICALLY trong 1 Firestore transaction —
 * tương đương post_document_movements(). Nếu bất kỳ bước nào lỗi, toàn bộ
 * transaction tự động rollback (Firestore không ghi gì cả).
 */
export async function postMovements(
  movements: StockMovementInput[],
  opts: { refType: RefType; refId: string; userId?: string | null }
): Promise<PostResult> {
  if (movements.length === 0) return { count: 0, results: [] };

  return adminDb.runTransaction(async (tx) => {
    // ── 1) Đọc số dư hiện tại của mọi cặp (kho, hàng hóa) liên quan ──
    const keyInfo = new Map<string, { khoId: string; hangHoaId: string }>();
    for (const m of movements) keyInfo.set(tonKhoDocId(m.khoId, m.hangHoaId), { khoId: m.khoId, hangHoaId: m.hangHoaId });
    const keys = [...keyInfo.keys()];
    const refs = keys.map((k) => adminDb.collection("warehouse_ton_kho").doc(k));
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));

    const balances = new Map<string, number>();
    snaps.forEach((snap, i) => {
      const data = snap.exists ? (snap.data() as TonKho) : undefined;
      balances.set(keys[i], data?.soLuong ?? 0);
    });

    // ── 2) Mô phỏng tuần tự trong bộ nhớ để tính stock_before/after ──
    const now = new Date().toISOString();
    const ledgerEntries: WarehouseLedgerEntry[] = [];
    const results: PostResult["results"] = [];

    for (const m of movements) {
      const key = tonKhoDocId(m.khoId, m.hangHoaId);
      const stockBefore = balances.get(key) ?? 0;
      const stockAfter = stockBefore + m.soLuong * m.direction;
      balances.set(key, stockAfter);

      ledgerEntries.push({
        transactionType: m.transactionType,
        refType: opts.refType,
        refId: opts.refId,
        khoId: m.khoId,
        hangHoaId: m.hangHoaId,
        soLuong: m.soLuong,
        donGia: m.donGia,
        thanhTien: m.soLuong * m.donGia,
        direction: m.direction,
        stockBefore,
        stockAfter,
        createdBy: opts.userId ?? null,
        createdAt: now,
        notes: m.notes ?? null,
      });
      results.push({ khoId: m.khoId, hangHoaId: m.hangHoaId, stockBefore, stockAfter });
    }

    // ── 3) Ghi số dư cuối cùng + toàn bộ ledger entries ──
    for (const key of keys) {
      const { khoId, hangHoaId } = keyInfo.get(key)!;
      tx.set(adminDb.collection("warehouse_ton_kho").doc(key), {
        khoId,
        hangHoaId,
        soLuong: balances.get(key),
        updatedAt: now,
      } as TonKho);
    }
    for (const entry of ledgerEntries) {
      tx.set(adminDb.collection("warehouse_ledger").doc(), entry);
    }

    return { count: movements.length, results };
  });
}

/** post_document_movements: nhập/xuất kho — 1 chiều, 1 kho. */
export async function postDocumentMovements(params: {
  chiTiet: ChiTietInput[];
  refType: RefType;
  refId: string;
  khoId: string;
  direction: 1 | -1;
  transactionType: TransactionType;
  userId?: string | null;
}): Promise<PostResult> {
  const movements = await buildMovements(params.chiTiet, params.khoId, params.direction, params.transactionType);
  try {
    return await postMovements(movements, { refType: params.refType, refId: params.refId, userId: params.userId });
  } catch (e) {
    throw new WarehouseEngineError(
      `postDocumentMovements failed [${params.refType}/${params.refId}]: ${e instanceof Error ? e.message : e}`
    );
  }
}

/**
 * post_transfer_movements: chuyển kho — TRANSFER_OUT từ kho xuất +
 * TRANSFER_IN vào kho nhập, cả hai trong CÙNG một transaction. Không thể có
 * trường hợp kho xuất giảm nhưng kho nhập không tăng.
 */
export async function postTransferMovements(params: {
  chiTiet: ChiTietInput[];
  refId: string;
  khoXuatId: string;
  khoNhapId: string;
  userId?: string | null;
}): Promise<PostResult> {
  const movements: StockMovementInput[] = [];
  for (const ct of params.chiTiet) {
    const hangHoaId = await resolveHangHoaId(ct);
    if (!hangHoaId) continue;
    const soLuong = Number(ct.soLuong) || 0;
    if (soLuong <= 0) continue;
    const donGia = Number(ct.donGia) || 0;
    movements.push({
      khoId: params.khoXuatId,
      hangHoaId,
      soLuong,
      donGia,
      direction: -1,
      transactionType: "TRANSFER_OUT",
      notes: ct.ghiChu,
    });
    movements.push({
      khoId: params.khoNhapId,
      hangHoaId,
      soLuong,
      donGia,
      direction: 1,
      transactionType: "TRANSFER_IN",
      notes: ct.ghiChu,
    });
  }

  try {
    return await postMovements(movements, { refType: "chuyen_kho", refId: params.refId, userId: params.userId });
  } catch (e) {
    throw new WarehouseEngineError(
      `postTransferMovements failed [chuyen_kho/${params.refId}]: ${e instanceof Error ? e.message : e}`
    );
  }
}

/**
 * rollback_document_movements: đảo ngược toàn bộ giao dịch của 1 phiếu.
 * Gọi trước khi SỬA hoặc XÓA phiếu. Trả về số lượng giao dịch đã rollback.
 */
export async function rollbackDocument(params: {
  refType: RefType;
  refId: string;
  userId?: string | null;
}): Promise<number> {
  try {
    return await adminDb.runTransaction(async (tx) => {
      // Đọc toàn bộ ledger của phiếu này theo đúng thứ tự tạo (giống bản gốc
      // ORDER BY created_at ASC), rồi lọc REVERSAL ra trong JS — tránh phải
      // dùng filter "!=" của Firestore (buộc orderBy field đó trước, sẽ làm
      // sai thứ tự chronological cần cho việc mô phỏng tuần tự bên dưới).
      const query = adminDb
        .collection("warehouse_ledger")
        .where("refType", "==", params.refType)
        .where("refId", "==", params.refId)
        .orderBy("createdAt", "asc");
      const ledgerSnap = await tx.get(query);
      if (ledgerSnap.empty) return 0;

      const originalEntries = ledgerSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as WarehouseLedgerEntry) }))
        .filter((e) => e.transactionType !== "REVERSAL");
      if (originalEntries.length === 0) return 0;

      // Đọc số dư hiện tại của mọi cặp (kho, hàng hóa) liên quan.
      const keys = [...new Set(originalEntries.map((e) => tonKhoDocId(e.khoId, e.hangHoaId)))];
      const refs = keys.map((k) => adminDb.collection("warehouse_ton_kho").doc(k));
      const snaps = await Promise.all(refs.map((r) => tx.get(r)));
      const balances = new Map<string, number>();
      snaps.forEach((snap, i) => {
        const data = snap.exists ? (snap.data() as TonKho) : undefined;
        balances.set(keys[i], data?.soLuong ?? 0);
      });

      const now = new Date().toISOString();
      for (const entry of originalEntries) {
        const key = tonKhoDocId(entry.khoId, entry.hangHoaId);
        const reverseDirection = (entry.direction * -1) as 1 | -1;
        const stockBefore = balances.get(key) ?? 0;
        const stockAfter = stockBefore + entry.soLuong * reverseDirection;
        balances.set(key, stockAfter);

        const reversal: WarehouseLedgerEntry = {
          transactionType: "REVERSAL",
          refType: params.refType,
          refId: params.refId,
          khoId: entry.khoId,
          hangHoaId: entry.hangHoaId,
          soLuong: entry.soLuong,
          donGia: entry.donGia,
          thanhTien: entry.soLuong * entry.donGia,
          direction: reverseDirection,
          stockBefore,
          stockAfter,
          createdBy: params.userId ?? null,
          createdAt: now,
          notes: `Auto rollback of tx ${entry.id}`,
        };
        tx.set(adminDb.collection("warehouse_ledger").doc(), reversal);
      }

      for (const key of keys) {
        const entry = originalEntries.find((e) => tonKhoDocId(e.khoId, e.hangHoaId) === key)!;
        tx.set(adminDb.collection("warehouse_ton_kho").doc(key), {
          khoId: entry.khoId,
          hangHoaId: entry.hangHoaId,
          soLuong: balances.get(key),
          updatedAt: now,
        } as TonKho);
      }

      return originalEntries.length;
    });
  } catch (e) {
    throw new WarehouseEngineError(
      `rollbackDocument failed [${params.refType}/${params.refId}]: ${e instanceof Error ? e.message : e}`
    );
  }
}

/** check_stock: lấy tồn kho hiện tại — dùng để kiểm tra trước khi xuất (không cho xuất âm). */
export async function checkStock(khoId: string, hangHoaId: string): Promise<number> {
  const snap = await adminDb.collection("warehouse_ton_kho").doc(tonKhoDocId(khoId, hangHoaId)).get();
  if (!snap.exists) return 0;
  return (snap.data() as TonKho).soLuong ?? 0;
}

/** write_audit: ghi warehouse_audit_log — best-effort, không throw nếu ghi thất bại. */
export async function writeAudit(input: {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  entityNumber?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
}): Promise<void> {
  try {
    const entry: WarehouseAuditLog = {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      entityNumber: input.entityNumber ?? null,
      userId: input.userId ?? null,
      userEmail: input.userEmail ?? null,
      oldValues: input.oldValues ?? null,
      newValues: input.newValues ?? null,
      ipAddress: input.ipAddress ?? null,
      module: "warehouse",
      createdAt: new Date().toISOString(),
    };
    await adminDb.collection("warehouse_audit_log").add(entry);
  } catch (e) {
    console.error("[WarehouseEngine] writeAudit non-fatal error:", e);
  }
}
