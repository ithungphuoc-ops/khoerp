# HPCons ERP (khoerp)

Bản viết lại của HPCons ERP (gốc: FastAPI + Supabase Postgres) sang **Next.js 15.5.22 + Firebase
Firestore**. Xem kế hoạch tổng thể tại `KHO TỔNG/HPCONS ERP/docs/KE_HOACH_MIGRATE_NEXTJS.md` (repo gốc).

## Đăng nhập qua HPCore SSO (quan trọng)

khoerp **không tự đăng nhập** — toàn bộ xác thực xảy ra ở nền tảng trung tâm
`account.hpcore.vn`. Cơ chế (tham khảo triển khai thật từ `KhoUNICE_Web_NEW`,
`openspec/changes/remove-local-auth-hpcore-sso`):

- Người dùng đăng nhập ở `account.hpcore.vn`, nhận cookie `session` (HttpOnly,
  domain `.hpcore.vn`) — mọi subdomain kể cả `khoerp.hpcore.vn` tự động nhận cookie này.
- khoerp verify cookie đó bằng Firebase Admin SDK của project **`hpcons-portal`**
  (khác với project Firestore riêng của khoerp là `hpcons-khoerp`).
- Vai trò cấp cho user trong khoerp lấy từ Firestore `app_permissions/{uid}.{appId}`
  của `hpcons-portal` — do admin hpcore gán qua giao diện quản trị trung tâm, KHÔNG
  qua trang "Tài khoản" của khoerp.
- khoerp công bố `GET /api/roles` (public) để hpcore biết những vai trò hợp lệ khi gán quyền.
- Middleware tự redirect người chưa đăng nhập sang `account.hpcore.vn/login?next=...`.
  Người đã đăng nhập hpcore nhưng chưa được cấp quyền cho khoerp sẽ thấy màn hình
  "Chưa được cấp quyền" ngay trong app (không redirect lặp vô hạn).

⚠️ **Chưa chốt**: `HPCORE_APP_ID` (hằng số trong `src/lib/constants.ts`) hiện đặt tạm
là `"khoerp"` — cần Sếp xác nhận/đăng ký đúng tên với người quản lý `dashboardApps.ts`
bên repo `hpcons-portal` trước khi dùng thật, nếu không admin hpcore gán quyền sẽ
không khớp app này (xem entry "HPC Warehouse" trong `dashboardApps.ts`, đang bỏ trống
`id`/`href`/`rolesEndpoint`, có thể là dành cho khoerp hoặc cho KhoUNICE — cần làm rõ).

⚠️ **Việc còn để ngỏ**: Phase 3 (module IAM) của khoerp có sẵn trang "Tài khoản" tự
tạo user Firebase Auth riêng trong project `hpcons-khoerp` — dưới mô hình HPCore SSO,
việc tạo tài khoản/gán quyền app nên chuyển hẳn sang giao diện quản trị của hpcore,
giống cách `KhoUNICE_Web_NEW` đã xóa trang tạo tài khoản nội bộ. Trang "Tài khoản"
của khoerp **chưa bị xóa** — cần Sếp quyết định giữ lại (chỉ xem/hiển thị) hay bỏ hẳn.

## Chạy dev

```bash
npm install
cp .env.example .env.local   # điền 2 Service Account (xem comment trong file)
npm run dev
```

Mở http://localhost:3000 — chưa đăng nhập sẽ tự redirect sang `account.hpcore.vn`.
Vì cookie SSO chỉ hoạt động đúng trên domain `*.hpcore.vn`, test đăng nhập thật
end-to-end chỉ thực hiện được sau khi `khoerp.hpcore.vn` đã trỏ domain + deploy xong.

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
- `src/lib/firebase/admin.ts` — Admin SDK cho project `hpcons-khoerp` (dữ liệu riêng
  của khoerp), khởi tạo lazy để không vỡ build khi chưa có credentials.
- `src/lib/firebase/hpcoreAdmin.ts` — Admin SDK THỨ HAI cho project `hpcons-portal`
  (SSO trung tâm), chỉ dùng để verify session cookie + đọc `app_permissions`.
- `src/lib/server/auth.ts` — `getAuthState()`/`requireUser()` phân biệt rõ 3 trạng thái:
  chưa đăng nhập hpcore / đã đăng nhập nhưng chưa được cấp quyền / hợp lệ.
- `firestore.rules` / `firestore.indexes.json` — deploy bằng `firebase deploy --only
  firestore:rules,firestore:indexes` (cần `firebase login` trước) — chỉ áp dụng cho
  project `hpcons-khoerp`, không đụng tới `hpcons-portal`.

## Deploy

Hạ tầng đích: Firebase project `hpcons-khoerp` (Firestore của khoerp) + `hpcons-portal`
(SSO, chỉ đọc), Vercel team `hpcons-ita-sset`, domain `khoerp.hpcore.vn`. Các bước dưới
đây cần tài khoản/quyền truy cập của Sếp — Claude không tự làm được vì cần đăng nhập
Firebase/Vercel/DNS thật.

### 1. Firebase — deploy rules/indexes cho hpcons-khoerp

```bash
npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes --project hpcons-khoerp
```

(Không cần bật Firebase Authentication trên `hpcons-khoerp` nữa — đăng nhập xảy ra ở
`hpcons-portal`, ngoài phạm vi quản lý của khoerp.)

### 2. Vercel — tạo project + env vars

1. Vercel team `hpcons-ita-sset` → **Add New → Project** → import repo GitHub
   `ithungphuoc-ops/khoerp`. Vercel tự nhận diện Next.js, không cần cấu hình build command.
2. **Settings → Environment Variables** → thêm 2 biến trong `.env.example`
   (`FIREBASE_SERVICE_ACCOUNT_KEY` + `HPCORE_FIREBASE_SERVICE_ACCOUNT`) cho cả 3 môi
   trường Production/Preview/Development.
3. Deploy lần đầu (tự động khi push lên nhánh `main`, hoặc bấm Deploy thủ công).

### 3. Domain `khoerp.hpcore.vn`

1. Vercel project → **Settings → Domains** → thêm `khoerp.hpcore.vn` → Vercel cho biết
   bản ghi DNS cần tạo (thường là CNAME trỏ về `cname.vercel-dns.com`).
2. Vào nơi quản lý DNS của domain `hpcore.vn` → tạo bản ghi CNAME đó cho subdomain `khoerp`.
3. Đợi DNS lan truyền — Vercel tự cấp SSL sau khi domain xác minh xong.

Trạng thái lúc viết tài liệu này: DNS `khoerp.hpcore.vn` đã trỏ về Vercel (IP
`76.76.21.21`), nhưng TLS handshake thất bại (chưa có project Vercel nào gắn domain
này) — nghĩa là **bước 2 (kết nối repo vào Vercel) + bước 3.1 (thêm domain trong Vercel)
vẫn chưa làm**, dù DNS có vẻ đã sẵn.

### 4. Đăng ký app với HPCore (bắt buộc để SSO hoạt động)

- Xác nhận `HPCORE_APP_ID` chính thức với người quản lý `hpcons-portal` (xem mục
  "Đăng nhập qua HPCore SSO" ở trên) và cập nhật hằng số trong `src/lib/constants.ts`
  nếu khác `"khoerp"`.
- Người quản lý hpcore cần gắn entry cho khoerp trong `dashboardApps.ts` (`id`, `href`
  = `https://khoerp.hpcore.vn`, `rolesEndpoint` = `https://khoerp.hpcore.vn/api/roles`).
- Cấp quyền `app_permissions` cho ít nhất 1 tài khoản (vd `nguyenhuuphuoc@hpcons.com.vn`)
  role `ADMIN` trước khi go-live, nếu không sẽ không ai vào quản trị được khoerp.

### 5. Go-live

Vì đây là big-bang migration (dữ liệu Supabase hiện tại chỉ là demo, không cần di chuyển
— xem quyết định ở đầu quá trình chuyển đổi), sau khi xác nhận `khoerp.hpcore.vn` chạy ổn
định, có thể tắt hệ Python/Supabase cũ.
