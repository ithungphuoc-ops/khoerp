# HPCons ERP (khoerp)

Bản viết lại của HPCons ERP (gốc: FastAPI + Supabase Postgres) sang **Next.js 15.5.22 + Firebase
Firestore**. Xem kế hoạch tổng thể tại `KHO TỔNG/HPCONS ERP/docs/KE_HOACH_MIGRATE_NEXTJS.md` (repo gốc).

## Chạy dev

```bash
npm install
cp .env.example .env.local   # điền Firebase Web config + Service Account key
npm run dev
```

Mở http://localhost:3000 — chưa đăng nhập sẽ tự redirect sang `/login`.

## Kiểm thử

```bash
npm run lint     # ESLint
npm run build    # type-check + build production
npm run test:emulator   # test Warehouse Engine qua Firebase Local Emulator (khuyến nghị)
```

`npm run test:emulator` chạy `firebase emulators:exec` bọc quanh Vitest — **không cần** Firebase
project thật/service account, chỉ cần Java (JRE 11+) cài sẵn trên máy.

> ⚠️ **Lưu ý nếu đường dẫn project chứa ký tự Unicode** (ví dụ tiếng Việt có dấu như
> `KHO TỔNG`): Firestore Emulator là ứng dụng Java, và trên Windows, JVM có lỗi giải mã
> đường dẫn chứa ký tự ngoài ASCII (ký tự bị biến thành `?`, gây lỗi
> `FileNotFoundException`). Nếu gặp lỗi này, cách xử lý: map thư mục dự án sang một ổ đĩa ảo
> không dấu bằng lệnh `subst` (chỉ cần cho việc chạy Firestore Emulator, không ảnh hưởng gì
> tới code):
>
> ```powershell
> subst X: "đường-dẫn-đầy-đủ-tới-thư-mục-khoerp"
> ```
>
> rồi chạy `firebase emulators:start` từ `X:\`, còn `vitest` thì vẫn chạy bình thường từ
> đường dẫn gốc (Node.js không có lỗi này, chỉ Java mới bị) với
> `FIRESTORE_EMULATOR_HOST=localhost:8080` trỏ vào emulator đang chạy trên `X:\`.
> Gỡ bằng `subst X: /D` khi xong.

## Cấu trúc

- `src/app/api/**` — REST API (Route Handlers), thay cho các router FastAPI gốc.
- `src/lib/server/warehouseEngine.ts` — engine tồn kho (Firestore Transactions), phần lõi
  nghiệp vụ quan trọng nhất, có test thật trong `warehouseEngine.test.ts`.
- `src/lib/firebase/{client,admin}.ts` — Firebase SDK, khởi tạo lazy để không vỡ build khi
  chưa có credentials.
- `firestore.rules` / `firestore.indexes.json` — deploy bằng `firebase deploy --only
  firestore:rules,firestore:indexes` (cần `firebase login` trước).

## Deploy

Xem Phase 9 trong kế hoạch migrate — Vercel team `hpcons-ita-sset`, domain `khoerp.hpcore.vn`,
Firebase project `hpcons-khoerp`.
