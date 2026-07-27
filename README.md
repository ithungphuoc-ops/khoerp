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
là `"khoerp"` — Sếp xác nhận entry "HPC Warehouse" trong `dashboardApps.ts` KHÔNG
liên quan tới khoerp, nghĩa là khoerp vẫn chưa có entry chính thức trong
`dashboardApps.ts` của `hpcons-portal`. Cần người quản lý `hpcons-portal` tạo entry
mới cho khoerp (`id` khớp `HPCORE_APP_ID`, `href` = `https://khoerp.hpcore.vn`,
`rolesEndpoint` = `https://khoerp.hpcore.vn/api/roles`) rồi xác nhận lại giá trị
`HPCORE_APP_ID` có cần đổi khác `"khoerp"` không.

Trang "Tài khoản" nội bộ (tạo/khóa/reset mật khẩu/đổi vai trò thủ công) đã được
**xóa** theo quyết định của Sếp — toàn bộ việc đó chuyển hẳn sang giao diện quản trị
`account.hpcore.vn`. `GET /api/iam/accounts` vẫn còn (chỉ đọc) vì trang Nhóm cần để
chọn thành viên thêm vào nhóm nội bộ.

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

✅ **Đã xong**: project Vercel `khoerp` đã tồn tại (Git-connected, tự deploy mỗi lần
push nhánh `main`), domain `khoerp.hpcore.vn` đã được thêm vào project và đã xác
minh xong — SSL do Let's Encrypt cấp tự động, đã kiểm tra thật:

```
curl https://khoerp.hpcore.vn/api/roles        # 200, JSON danh sách vai trò
curl https://khoerp.hpcore.vn/                 # 307 -> account.hpcore.vn/login
curl https://khoerp.hpcore.vn/api/auth/me      # 401 khi chưa đăng nhập
```

Lưu ý trong quá trình deploy thật đã phát sinh và fix 2 lỗi không lộ ra khi chạy
`next dev` cục bộ (xem lịch sử commit "Phase 12"/"Phase 13" để biết chi tiết):

1. Project Vercel ban đầu có Framework Preset = "Other" (không phải "Next.js") —
   khiến build không sinh output đúng, mọi route trả 404. Đã sửa qua Vercel API
   (`PATCH /v9/projects/{id}` với `framework: "nextjs"`).
2. `firebase-admin` (qua `jwks-rsa` → `jose`) gây lỗi `ERR_REQUIRE_ESM` trên runtime
   Node của Vercel (jose từ bản 6.x bỏ hẳn build CommonJS) — mọi route đụng tới
   Firebase Admin Auth (kể cả `/api/auth/me` khi không có cookie, vì lỗi xảy ra ngay
   lúc import module) đều trả 500. Đã fix bằng cách ghim `jwks-rsa@3.2.2` (bản dùng
   `jose@4.x` — vẫn còn build CJS) qua `package.json` "overrides".

### 4. Đăng ký app với HPCore (bắt buộc để SSO hoạt động — CHƯA XONG)

- ⚠️ Người quản lý `hpcons-portal` cần tạo entry mới cho khoerp trong
  `dashboardApps.ts` (`id` khớp `HPCORE_APP_ID` = `"khoerp"` hiện tại, `href` =
  `https://khoerp.hpcore.vn`, `rolesEndpoint` = `https://khoerp.hpcore.vn/api/roles`) —
  xem mục "Chưa chốt" ở phần SSO phía trên.
- Cấp quyền `app_permissions` cho ít nhất 1 tài khoản (vd `nguyenhuuphuoc@hpcons.com.vn`)
  role `ADMIN` trước khi go-live, nếu không sẽ không ai vào quản trị được khoerp.

### 5. Firestore rules/indexes cho hpcons-khoerp (CHƯA XONG)

Bước 1 ở trên (`npx firebase login` + `firebase deploy --only firestore:rules,...`)
cần chạy ở terminal có thể mở trình duyệt để đăng nhập Google — không chạy được từ môi
trường CI/non-interactive. Sếp chạy 2 lệnh ở mục 1 trên máy của Sếp khi rảnh.

### 6. Go-live

Vì đây là big-bang migration (dữ liệu Supabase hiện tại chỉ là demo, không cần di chuyển
— xem quyết định ở đầu quá trình chuyển đổi), sau khi bước 4 và 5 xong, có thể tắt hệ
Python/Supabase cũ.
