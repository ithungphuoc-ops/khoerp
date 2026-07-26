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

Hạ tầng đích: Firebase project `hpcons-khoerp` (Firestore + Auth), Vercel team
`hpcons-ita-sset`, domain `khoerp.hpcore.vn`. Các bước dưới đây cần tài khoản/quyền
truy cập của Sếp — Claude không tự làm được vì cần đăng nhập Firebase/Vercel/DNS thật.

### 1. Firebase — bật Auth + deploy rules/indexes

1. Firebase Console → project `hpcons-khoerp` → **Authentication → Sign-in method** →
   bật **Email/Password**.
2. Lấy Web config: **Project settings → Your apps → SDK setup and configuration** →
   copy 6 giá trị vào biến `NEXT_PUBLIC_FIREBASE_*` (xem `.env.example`).
3. Lấy Service Account: **Project settings → Service accounts → Generate new private
   key** → tải file JSON, dán nguyên nội dung (1 dòng) vào biến
   `FIREBASE_SERVICE_ACCOUNT_KEY` — **không commit file này vào git**.
4. Deploy rules + indexes (cần cài `firebase-tools` — đã có sẵn trong devDependencies):
   ```bash
   npx firebase login
   npx firebase deploy --only firestore:rules,firestore:indexes --project hpcons-khoerp
   ```

### 2. Vercel — tạo project + env vars

1. Vercel team `hpcons-ita-sset` → **Add New → Project** → import repo GitHub
   `ithungphuoc-ops/khoerp`. Vercel tự nhận diện Next.js, không cần cấu hình build command.
2. **Settings → Environment Variables** → thêm toàn bộ biến trong `.env.example`
   (6 biến `NEXT_PUBLIC_FIREBASE_*` + `FIREBASE_SERVICE_ACCOUNT_KEY`) cho cả 3 môi
   trường Production/Preview/Development.
3. Deploy lần đầu (tự động khi push lên nhánh `main`, hoặc bấm Deploy thủ công).

### 3. Domain `khoerp.hpcore.vn`

1. Vercel project → **Settings → Domains** → thêm `khoerp.hpcore.vn` → Vercel cho biết
   bản ghi DNS cần tạo (thường là CNAME trỏ về `cname.vercel-dns.com`).
2. Vào nơi quản lý DNS của domain `hpcore.vn` → tạo bản ghi CNAME đó cho subdomain `khoerp`.
3. Đợi DNS lan truyền (vài phút đến vài giờ) — Vercel tự cấp SSL sau khi domain xác minh xong.

### 4. Firebase Auth — thêm domain được phép (bắt buộc, hay bị quên)

Firebase Auth chỉ cho đăng nhập từ các domain có trong danh sách cho phép. Vào
**Authentication → Settings → Authorized domains** → thêm:
- `khoerp.hpcore.vn`
- domain preview mặc định của Vercel (dạng `*.vercel.app`, thêm domain preview cụ thể
  nếu cần test trên đó)

Thiếu bước này sẽ gặp lỗi `auth/unauthorized-domain` khi đăng nhập trên domain thật.

### 5. Go-live

Vì đây là big-bang migration (dữ liệu Supabase hiện tại chỉ là demo, không cần di chuyển
— xem quyết định ở đầu quá trình chuyển đổi), sau khi xác nhận `khoerp.hpcore.vn` chạy ổn
định, có thể tắt hệ Python/Supabase cũ.
