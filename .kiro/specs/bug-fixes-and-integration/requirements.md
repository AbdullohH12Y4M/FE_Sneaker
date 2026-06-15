# Requirements Document

## Introduction

Dokumen ini mendefinisikan requirement untuk perbaikan menyeluruh bug dan integrasi pada proyek SneakerLocal (Next.js + Supabase + Prisma). Requirement dikonfirmasi langsung dari pembacaan kode sumber aktual dan mencakup 23 masalah yang dipetakan ke dalam requirement terstruktur.

Sumber analisa: pembacaan langsung 14+ file kode sumber + analisa arsitektur menyeluruh (middleware, API routes, Zustand stores, halaman admin, halaman publik, komponen layout).

---

## Glossary

- **Navbar** — Komponen navigasi utama (`src/components/layout/Navbar.tsx`)
- **Middleware** — Layer autentikasi Next.js Edge (`src/middleware.ts`)
- **Admin_Layout** — Layout wrapper halaman admin (`src/app/admin/layout.tsx`)
- **Admin_Dashboard** — Halaman dashboard admin (`src/app/admin/page.tsx`)
- **Admin_Users_Page** — Halaman daftar pengguna admin (`src/app/admin/users/page.tsx`)
- **Home_Page** — Halaman beranda (`src/app/page.tsx`)
- **Search_Page** — Halaman katalog/pencarian (`src/app/search/page.tsx`)
- **Checkout_Page** — Halaman checkout (`src/app/checkout/page.tsx`)
- **Orders_Page** — Halaman daftar pesanan (`src/app/orders/page.tsx`)
- **Order_Detail_Page** — Halaman detail pesanan (`src/app/orders/[id]/page.tsx`)
- **Profile_Page** — Halaman profil pengguna (`src/app/profile/page.tsx`)
- **Cart_Store** — Zustand store keranjang belanja (`src/store/cart.ts`)
- **Inventories_API** — Endpoint update stok (`src/app/api/inventories/[skuId]/route.ts`)
- **Export_API** — Endpoint export orders (`src/app/api/orders/admin/export/route.ts`)
- **productsApi** — Helper fungsi produk (`src/lib/api.ts`)
- **parseProductsList** — Fungsi normalisasi produk (`src/lib/api-helpers.ts`)
- **Wrapped_Response** — Format `{ success: true, data: {...} }` dari route yang pakai `createHandler`
- **Raw_Response** — Format langsung `{ items: [...] }` dari `/api/products/all`

---

## Requirements

---

### PRIORITAS KRITIS

---

### Requirement 1: Navbar Search — Perbaiki Endpoint, Response Path, dan Normalisasi Gambar

**User Story:** Sebagai pengguna, saya ingin mencari produk melalui navbar dan melihat gambar produk di hasil pencarian, sehingga saya bisa menemukan produk yang diinginkan dengan cepat.

**Konteks bug (BUG-01):** `fetchSearch` saat ini memanggil `productsApi.getAll()` tanpa parameter — hits `/api/products` yang tidak include `images`. Response path yang dicoba (`res.data?.products ?? res.data?.items`) juga salah. Gambar selalu `undefined`. Setiap keystroke fetch semua produk tanpa filter server-side.

#### Acceptance Criteria

1. WHEN pengguna mengetik query di Navbar search, THE Navbar SHALL memanggil `productsApi.getAllPublic({ q: query, limit: 5 })` yang hits `/api/products/all`
2. WHEN response dari `getAllPublic` diterima, THE Navbar SHALL memproses hasilnya menggunakan `parseProductsList(res.data)` untuk normalisasi gambar
3. WHEN produk memiliki `images: [{id, url}]` dari API, THE Navbar SHALL menampilkan `p.images[0]` sebagai URL string setelah normalisasi
4. IF `parseProductsList` mengembalikan array kosong, THEN THE Navbar SHALL menampilkan state "Tidak ada hasil" tanpa melempar exception
5. WHEN pengguna menekan Enter di search input dengan query tidak kosong, THE Navbar SHALL menavigasi ke `/search?q={encodeURIComponent(query)}`
6. WHEN dropdown pencarian terbuka dan ada hasil, THE Navbar SHALL menampilkan link "Lihat semua hasil untuk '{query}'" mengarah ke `/search?q={query}`
7. WHILE pencarian sedang berlangsung, THE Navbar SHALL menampilkan teks "Mencari..." di dropdown

---

### Requirement 2: Middleware — Izinkan STAFF Akses `/admin`

**User Story:** Sebagai STAFF, saya ingin dapat mengakses halaman admin, sehingga saya bisa mengelola toko sesuai hak akses saya.

**Konteks bug (BUG-02):** `middleware.ts` menggunakan `const isAdmin = session?.user?.role === 'ADMIN'` — STAFF diblokir sebelum sampai ke layout. Admin layout sudah benar (cek ADMIN||STAFF), tapi tidak pernah tercapai.

#### Acceptance Criteria

1. WHEN user dengan `role = 'STAFF'` mengakses `/admin/*` dengan token valid, THE Middleware SHALL mengizinkan akses dan mengembalikan `NextResponse.next()`
2. WHEN user dengan `role = 'ADMIN'` mengakses `/admin/*` dengan token valid, THE Middleware SHALL mengizinkan akses
3. WHEN user dengan `role = 'CUSTOMER'` mengakses `/admin/*`, THE Middleware SHALL redirect ke `/`
4. WHEN user tidak terautentikasi mengakses `/admin/*`, THE Middleware SHALL redirect ke `/login?callbackUrl=/admin`
5. FOR ALL role dalam `['ADMIN', 'STAFF']`, THE Middleware SHALL mengevaluasi kondisi akses menggunakan `['ADMIN', 'STAFF'].includes(role)` bukan `role === 'ADMIN'`

---

### Requirement 3: Inventaris API — Izinkan STAFF Update Stok

**User Story:** Sebagai STAFF, saya ingin bisa mengupdate stok produk melalui admin panel, sehingga data inventaris selalu akurat.

**Konteks bug (BUG-03):** `/api/inventories/[skuId]/route.ts` menggunakan `requireAdmin` yang menolak semua non-ADMIN dengan 403. STAFF mendapat error saat mencoba update stok — padahal `/api/orders/admin` sudah pakai `requiredRoles: ['ADMIN', 'STAFF']`.

#### Acceptance Criteria

1. WHEN user dengan `role = 'STAFF'` mengirim `PATCH /api/inventories/{skuId}` dengan token valid, THE Inventories_API SHALL memproses request dan mengembalikan 200
2. WHEN user dengan `role = 'ADMIN'` mengirim `PATCH /api/inventories/{skuId}`, THE Inventories_API SHALL memproses request
3. WHEN user dengan `role = 'CUSTOMER'` mengirim `PATCH /api/inventories/{skuId}`, THE Inventories_API SHALL mengembalikan 403
4. THE Inventories_API SHALL menggunakan `requiredRoles: ['ADMIN', 'STAFF']` (bukan `requireAdmin`) untuk otorisasi
5. FOR ALL role dalam `['ADMIN', 'STAFF']`, THE Inventories_API SHALL mengizinkan operasi update stok

---

### Requirement 4: Admin Dashboard — Izinkan STAFF Fetch dan Render Data

**User Story:** Sebagai STAFF, saya ingin bisa melihat dan mengelola pesanan di dashboard admin, sehingga saya bisa menjalankan tugas operasional toko.

**Konteks bug (BUG-04):** `admin/page.tsx` punya dua kondisi yang memblokir STAFF secara client-side meskipun middleware sudah diperbaiki: (1) fetch hanya berjalan jika `role === 'ADMIN'`, (2) render mengembalikan `null` jika bukan ADMIN.

#### Acceptance Criteria

1. WHEN session user memiliki `role = 'STAFF'`, THE Admin_Dashboard SHALL mengeksekusi `fetchOrders()` (tidak return early)
2. WHEN session user memiliki `role = 'STAFF'`, THE Admin_Dashboard SHALL merender konten pesanan (tidak return null)
3. WHEN session user memiliki `role = 'STAFF'`, THE Admin_Dashboard SHALL menampilkan tombol export CSV dan JSON
4. THE Admin_Dashboard SHALL mengevaluasi semua role check menggunakan `['ADMIN', 'STAFF'].includes(role)` bukan `role === 'ADMIN'`
5. FOR ALL user dengan role `ADMIN` atau `STAFF`, THE Admin_Dashboard SHALL menampilkan data pesanan yang sama

---

### Requirement 5: Admin Dashboard — Tambah Status `DELIVERED` ke Order Status List

**User Story:** Sebagai admin/STAFF, saya ingin bisa menandai pesanan sebagai "Sudah Diterima", sehingga lifecycle pesanan bisa diselesaikan dengan benar.

**Konteks bug (LOGIC-04):** `ORDER_STATUSES = ['PENDING', 'WAITING_CONFIRMATION', 'PAID', 'SHIPPED', 'CANCELLED']` — `DELIVERED` tidak ada. Admin tidak bisa set status ini meski dipakai di kalkulasi revenue.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL menyertakan `'DELIVERED'` dalam array `ORDER_STATUSES`
2. WHEN pesanan memiliki status selain yang ada di `ORDER_STATUSES`, THE Admin_Dashboard SHALL tetap menampilkan tombol untuk semua status termasuk DELIVERED
3. WHEN admin mengklik tombol status, THE Admin_Dashboard SHALL memanggil `ordersApi.updateStatus(orderId, newStatus)` dengan status yang dipilih
4. THE `ORDER_STATUS_LABELS` di `utils.ts` sudah punya entry `DELIVERED: 'Sudah Diterima'` — pastikan ini digunakan di tombol

---

### Requirement 6: Export Orders API — Izinkan STAFF Export

**User Story:** Sebagai STAFF, saya ingin bisa mengekspor data pesanan ke CSV/JSON, sehingga saya bisa membuat laporan tanpa bergantung pada ADMIN.

**Konteks bug (BUG-06):** `/api/orders/admin/export/route.ts` menggunakan `requireAdmin` — STAFF mendapat 403.

#### Acceptance Criteria

1. WHEN user dengan `role = 'STAFF'` mengirim `GET /api/orders/admin/export`, THE Export_API SHALL mengembalikan file export (bukan 403)
2. WHEN user dengan `role = 'ADMIN'` mengirim request export, THE Export_API SHALL mengembalikan file export
3. WHEN user dengan `role = 'CUSTOMER'` mengirim request export, THE Export_API SHALL mengembalikan 403
4. THE Export_API SHALL menggunakan `requiredRoles: ['ADMIN', 'STAFF']` untuk otorisasi

---

### Requirement 7: Admin Users Page — Tampilkan Nama dan Perbaiki Interface

**User Story:** Sebagai admin, saya ingin melihat nama dan role lengkap pengguna di daftar users, sehingga saya bisa mengidentifikasi pengguna dengan mudah.

**Konteks bug (BUG-05):** Interface `User` lokal tidak punya `name`, tidak punya `'STAFF'` di role type, dan punya `updatedAt` yang tidak di-return server.

#### Acceptance Criteria

1. WHEN interface `User` didefinisikan di `admin/users/page.tsx`, THE interface SHALL menyertakan `name: string | null`
2. WHEN interface `User` didefinisikan, THE interface SHALL menyertakan `'STAFF'` dalam union type role: `'CUSTOMER' | 'ADMIN' | 'STAFF'`
3. WHEN interface `User` didefinisikan, THE interface SHALL menghapus `updatedAt` (tidak di-return oleh `/api/auth/users`)
4. WHEN tabel pengguna dirender, THE Admin_Users_Page SHALL menampilkan kolom "Nama" setelah kolom "Email"
5. WHERE user belum mengisi nama (`name === null`), THE Admin_Users_Page SHALL menampilkan placeholder `'-'`
6. WHEN badge role dirender, THE Admin_Users_Page SHALL mendukung warna berbeda untuk role `STAFF` (mis. `badge-info`)

---

### Requirement 8: Home Page — Hapus Mock Data Fallback

**User Story:** Sebagai pengguna, saya ingin melihat data produk nyata dari server, bukan data demo, sehingga informasi harga dan stok selalu akurat.

**Konteks bug:** `src/app/page.tsx` masih import dan menggunakan `mockProducts` sebagai fallback saat API error.

#### Acceptance Criteria

1. THE Home_Page SHALL menghapus `import { mockProducts } from '@/data/mockProducts'` dan semua referensi terkait
2. THE Home_Page SHALL menghapus state `isFromMock` beserta semua kondisi yang bergantung padanya
3. WHEN `productsApi.listCatalog()` berhasil, THE Home_Page SHALL merender produk dari API
4. WHEN `productsApi.listCatalog()` gagal, THE Home_Page SHALL menampilkan pesan error "Gagal memuat produk. Coba refresh halaman." dan array produk kosong
5. THE Home_Page SHALL tidak menampilkan banner "Mode Demo" atau teks fallback di hero section
6. THE Home_Page SHALL menggunakan `Product[]` dari `@/types` sebagai tipe state `products` (bukan `any[]`)

---

### Requirement 9: Search Page — Query Parameter `?q=` dan Hapus Mock Fallback

**User Story:** Sebagai pengguna, saya ingin hasil pencarian muncul ketika diredirect dari navbar search, sehingga konteks pencarian tidak hilang.

**Konteks bug:** Search page membaca `params.get('search')` tapi Navbar akan redirect ke `/search?q=...`. Juga masih ada fallback ke `mockProducts`.

#### Acceptance Criteria

1. WHEN Search_Page diakses dengan URL `/search?q=nike`, THE Search_Page SHALL membaca query dari `params.get('q')` (bukan hanya `params.get('search')`)
2. THE Search_Page SHALL mendukung `params.get('search')` sebagai fallback untuk kompatibilitas mundur dengan link lama
3. WHEN query tidak kosong, THE Search_Page SHALL memfilter produk berdasarkan nama dan deskripsi yang mengandung query
4. THE Search_Page SHALL menghapus `import { mockProducts }` dan semua referensi terkait
5. WHEN `productsApi.getAllPublic()` gagal, THE Search_Page SHALL menampilkan pesan error dan array kosong (bukan data mock)
6. WHEN search query kosong, THE Search_Page SHALL menampilkan semua produk tanpa filter teks

---

### Requirement 10: Checkout — Transparansi Estimasi Total Sebelum Submit

**User Story:** Sebagai pembeli, saya ingin mengetahui perkiraan total yang harus dibayar sebelum membuat pesanan, sehingga saya tidak terkejut melihat total di invoice.

**Konteks bug (LOGIC-01):** `const total = subtotal` — UI menampilkan total tanpa ongkir, tapi server menyimpan total dengan ongkir. Gap ini menyebabkan shock saat user lihat detail order.

#### Acceptance Criteria

1. WHEN `shippingType = 'DELIVERY'`, THE Checkout_Page SHALL menampilkan estimasi ongkir flat Rp10.000 di ringkasan pesanan
2. WHEN `shippingType = 'PICKUP'`, THE Checkout_Page SHALL menampilkan ongkir `Rp0 (Ambil Sendiri)`
3. WHEN `shippingType = 'DELIVERY'`, THE Checkout_Page SHALL menampilkan estimasi total = subtotal + estimasi ongkir dengan label "Estimasi Total"
4. THE Checkout_Page SHALL menampilkan catatan kecil "Total final dikonfirmasi setelah pesanan dibuat" di bawah estimasi total
5. THE Checkout_Page SHALL tidak menampilkan nilai yang sama persis untuk "Subtotal" dan "Total Bayar" tanpa menyebut ongkir

---

### Requirement 11: Navbar — Perbaiki Active State Kategori

**User Story:** Sebagai pengguna, saya ingin link kategori yang sedang aktif terlihat highlighted di navbar, sehingga saya tahu sedang berada di kategori mana.

**Konteks bug (UX-04):** `pathname === link.href` selalu false untuk link dengan query string (`/?category=SNEAKERS`) karena `pathname` hanya berisi path tanpa query.

#### Acceptance Criteria

1. WHEN URL aktif adalah `/?category=SNEAKERS`, THE Navbar SHALL menerapkan class `navLinkActive` pada link kategori SNEAKERS
2. WHEN URL aktif adalah `/` tanpa parameter `category`, THE Navbar SHALL menerapkan class `navLinkActive` hanya pada link "Beranda"
3. THE Navbar SHALL menggunakan `useSearchParams()` untuk membandingkan query parameter `category` dengan link href
4. WHEN `pathname` berubah atau `searchParams` berubah, THE Navbar SHALL memperbarui active state link secara otomatis

---

### PRIORITAS MEDIUM

---

### Requirement 12: Order Detail — Upload Ulang Bukti Saat WAITING_CONFIRMATION

**User Story:** Sebagai pembeli, saya ingin bisa mengganti bukti transfer jika saya mengirim bukti yang salah, sehingga pesanan saya tetap bisa diproses.

**Konteks bug (LOGIC-03):** `canUploadProof = order.status === 'PENDING' && !order.paymentProofUrl` — setelah upload pertama, status berubah ke `WAITING_CONFIRMATION` dan form upload menghilang.

#### Acceptance Criteria

1. WHEN `order.status = 'PENDING'` dan belum ada `paymentProofUrl`, THE Order_Detail_Page SHALL menampilkan tombol "Unggah Bukti Transfer"
2. WHEN `order.status = 'WAITING_CONFIRMATION'`, THE Order_Detail_Page SHALL menampilkan tombol "Ganti Bukti Pembayaran"
3. WHEN `order.status = 'WAITING_CONFIRMATION'`, THE Order_Detail_Page SHALL menampilkan info box "Bukti pembayaran sedang diverifikasi admin"
4. WHEN `order.status = 'PAID'`, THE Order_Detail_Page SHALL menampilkan info box "Pembayaran sudah diverifikasi" tanpa tombol upload
5. WHEN `order.status = 'CANCELLED'` atau `'SHIPPED'` atau `'DELIVERED'`, THE Order_Detail_Page SHALL tidak menampilkan form upload

---

### Requirement 13: Order Detail — Error Handling di `loadOrder` setelah Upload

**User Story:** Sebagai pembeli, saya ingin melihat pesan error yang jelas jika terjadi masalah saat refresh data pesanan setelah upload, sehingga saya tidak bingung dengan UI yang tidak responsif.

**Konteks bug (UX-02):** `handleUpload` memanggil `loadOrder()` tanpa try-catch — jika `loadOrder` gagal setelah upload berhasil, error tidak ter-handle dan UI bisa freeze.

#### Acceptance Criteria

1. WHEN `loadOrder()` dipanggil dari dalam `handleUpload` dan terjadi error, THE Order_Detail_Page SHALL menangkap error tersebut dengan try-catch
2. WHEN error terjadi di dalam `handleUpload`, THE Order_Detail_Page SHALL memanggil `setError(extractErrorMessage(err))` agar pesan error tampil ke user
3. WHEN error terjadi, THE Order_Detail_Page SHALL memanggil `setUploading(false)` di blok `finally` agar loading state tidak stuck

---

### Requirement 14: Orders Page — Ganti `window.confirm` dengan Modal Konfirmasi

**User Story:** Sebagai pengguna, saya ingin dialog konfirmasi pembatalan pesanan yang terlihat konsisten dengan desain aplikasi, bukan dialog browser bawaan yang tidak bisa di-style.

**Konteks bug (UX-03):** `window.confirm()` digunakan untuk konfirmasi pembatalan — tidak bisa di-style, blokir JS thread, dan tidak berfungsi di beberapa environment.

#### Acceptance Criteria

1. WHEN pengguna mengklik tombol "Batalkan Pesanan", THE Orders_Page SHALL menampilkan modal konfirmasi custom (bukan `window.confirm`)
2. THE modal SHALL menampilkan teks konfirmasi dan dua tombol: "Ya, Batalkan" dan "Tidak, Kembali"
3. WHEN pengguna mengklik "Ya, Batalkan", THE Orders_Page SHALL memanggil `ordersApi.updateStatus(orderId, 'CANCELLED')`
4. WHEN pengguna mengklik "Tidak, Kembali", THE modal SHALL ditutup tanpa aksi apapun
5. THE modal SHALL menggunakan state React (`useState`) untuk kontrol visibilitas — tidak blokir JS thread

---

### Requirement 15: Admin Users — Perbaiki Normalizer `normalizeProduct` Duplikat

**User Story:** Sebagai developer, saya ingin satu sumber kebenaran untuk normalisasi produk, sehingga tidak ada data yang tidak konsisten akibat dua implementasi berbeda.

**Konteks bug (BUG-07 / DEBT-05):** `utils.ts` dan `api-helpers.ts` keduanya punya `normalizeProduct` dengan signature berbeda. Versi `utils.ts` tidak handle `images: [{id, url}]` → gambar bisa rusak di halaman admin yang import dari `utils.ts`.

#### Acceptance Criteria

1. THE `normalizeProduct` di `src/lib/utils.ts` SHALL dihapus
2. WHEN halaman admin menggunakan normalisasi produk, THE halaman SHALL mengimport `normalizeProduct` dari `src/lib/api-helpers.ts`
3. THE `normalizeProduct` di `api-helpers.ts` SHALL tetap menangani kedua format: `images: string[]` dan `images: [{id, url}]`
4. FOR ALL halaman yang sebelumnya import `normalizeProduct` dari `utils.ts`, THE halaman SHALL diupdate untuk import dari `api-helpers.ts`

---

### Requirement 16: Navbar — Fetch Kategori Dinamis dari API

**User Story:** Sebagai pengguna, saya ingin link kategori di navbar selalu mencerminkan kategori yang ada di database, sehingga navigasi tidak mengarah ke filter yang tidak ada.

**Konteks debt (DEBT-01):** `NAV_LINKS` hardcoded — jika admin tambah/hapus kategori via admin panel, navbar tidak berubah.

#### Acceptance Criteria

1. WHEN Navbar selesai di-mount, THE Navbar SHALL memanggil `categoriesApi.getAll()` untuk mendapatkan daftar kategori
2. WHEN API mengembalikan array kategori, THE Navbar SHALL merender link navigasi menggunakan data tersebut dengan format `/?category={category.slug.toUpperCase()}`
3. WHEN API `/api/categories` gagal, THE Navbar SHALL merender hanya link "Beranda" tanpa error yang tampil ke pengguna
4. THE Navbar SHALL menghapus konstanta `NAV_LINKS` yang hardcoded
5. FOR ALL kategori dari API, THE Navbar SHALL menampilkan label dari `category.name`
6. WHEN kategori sedang dimuat, THE Navbar SHALL merender placeholder atau loading state yang tidak mengganggu layout

---

### Requirement 17: Cart Store — Merge dengan Server Cart Setelah Login

**User Story:** Sebagai pengguna yang menambahkan produk ke cart sebelum login, saya ingin cart saya tidak hilang setelah login, sehingga saya tidak perlu menambah produk lagi.

**Konteks debt (LOGIC-02):** `mergeWithServerCart` ada di store tapi tidak pernah dipanggil. Schema DB punya model `Cart` dan `CartItem` tapi tidak dipakai.

#### Acceptance Criteria

1. WHEN user berhasil login, THE aplikasi SHALL memanggil `mergeWithServerCart()` dengan data cart dari server
2. WHERE backend menyediakan `/api/cart`, THE aplikasi SHALL fetch cart server setelah autentikasi berhasil
3. WHEN cart lokal dan server memiliki SKU yang sama, THE Cart_Store SHALL menjumlahkan quantity dengan cap di `maxStock`
4. WHEN cart lokal punya SKU yang tidak ada di server, THE Cart_Store SHALL mempertahankan item tersebut di merged cart
5. FOR ALL item di merged cart, THE Cart_Store SHALL memastikan `quantity <= maxStock` (invariant)

---

### Requirement 18: Profile Page — Upload Foto Profil ke Server

**User Story:** Sebagai pengguna, saya ingin foto profil saya tersimpan di server agar muncul di semua perangkat yang saya gunakan.

**Konteks debt (UX-01):** Foto profil disimpan di `localStorage` sebagai base64 — reset saat ganti browser, clear cache, atau private mode.

#### Acceptance Criteria

1. WHEN user mengupload foto profil, THE Profile_Page SHALL memanggil endpoint upload server (bukan menyimpan ke localStorage)
2. WHEN upload berhasil, THE Backend_API SHALL mengembalikan URL foto yang tersimpan di Supabase Storage
3. WHEN user membuka Profile_Page, THE Profile_Page SHALL menampilkan foto dari `session.user.image` (URL server)
4. THE Profile_Page SHALL menghapus semua penggunaan `localStorage.getItem('profile_image')` dan `localStorage.setItem('profile_image', ...)`
5. WHERE Supabase Storage digunakan, THE foto SHALL disimpan dengan path `avatars/users/{userId}/profile.{ext}`

---

### PRIORITAS MINOR

---

### Requirement 19: Utils — Hapus `normalizeProduct` Duplikat di `utils.ts`

Sudah dibahas di Requirement 15. Requirement ini adalah tracking khusus untuk perubahan di `utils.ts`.

#### Acceptance Criteria

1. THE `utils.ts` SHALL tidak mengekspor fungsi `normalizeProduct`
2. WHEN ada komponen yang import `normalizeProduct` dari `utils.ts`, THE import SHALL diganti ke `api-helpers.ts`
3. THE `utils.ts` SHALL mempertahankan semua fungsi lain yang masih dibutuhkan: `formatPrice`, `formatDate`, `ORDER_STATUS_LABELS`, `MALANG_DISTRICTS`, dll.

---

### Requirement 20: Home Page — Perbaiki Type Safety `products` State

**User Story:** Sebagai developer, saya ingin type safety yang benar di Home Page agar TypeScript dapat mendeteksi error lebih awal.

#### Acceptance Criteria

1. THE Home_Page SHALL mengubah `const [products, setProducts] = useState<any[]>([])` menjadi `useState<Product[]>([])`
2. THE Home_Page SHALL mengimport tipe `Product` dari `@/types`
3. THE perubahan tipe SHALL tidak memerlukan cast `as any` di tempat lain — `parseProductsList` sudah mengembalikan `Product[]`

---

## Correctness Properties (untuk Property-Based Testing)

### Properti 1: Normalisasi Produk Bersifat Idempoten

Untuk sembarang objek produk valid, `normalizeProduct(normalizeProduct(p))` harus menghasilkan output yang sama dengan `normalizeProduct(p)` — normalisasi dua kali tidak mengubah hasil.

**Memvalidasi:** Requirement 8, 9, 15

### Properti 2: Middleware Role Check Konsisten

Untuk sembarang token JWT valid dengan role dalam `['ADMIN', 'STAFF']`, middleware harus selalu mengizinkan akses ke `/admin/*`. Untuk sembarang role lain, selalu redirect.

**Memvalidasi:** Requirement 2

### Properti 3: Cart Merge Tidak Melebihi maxStock

Untuk sembarang kombinasi cart lokal dan cart server, setelah `mergeWithServerCart`, setiap item harus memiliki `quantity <= maxStock`. Properti ini harus berlaku untuk sembarang jumlah item.

**Memvalidasi:** Requirement 17

### Properti 4: parseProductsList Selalu Mengembalikan Array

Untuk sembarang input (null, undefined, objek kosong, wrapped response, raw response, array langsung), `parseProductsList` harus selalu mengembalikan `Product[]` — tidak pernah throw, tidak pernah return `undefined`.

**Memvalidasi:** Requirement 1, 8, 9

### Properti 5: Admin Stats Independent dari Filter UI

Nilai stats (total orders, total revenue, waiting count) yang ditampilkan di Admin_Dashboard harus sama terlepas dari nilai `statusFilter` yang aktif — stats harus mencerminkan semua data, bukan data yang difilter.

**Memvalidasi:** Requirement 4

---

## Matriks Requirement ↔ Bug/Debt

| Requirement | Item Sumber | Prioritas |
|---|---|---|
| Req 1 | BUG-01, UX-05 | Kritis |
| Req 2 | BUG-02 | Kritis |
| Req 3 | BUG-03 | Kritis |
| Req 4 | BUG-04 | Kritis |
| Req 5 | LOGIC-04 | Kritis |
| Req 6 | BUG-06 | Kritis |
| Req 7 | BUG-05 | Kritis |
| Req 8 | (mock home) | Kritis |
| Req 9 | (mock search + URL sync) | Kritis |
| Req 10 | LOGIC-01 | Kritis |
| Req 11 | UX-04 | Kritis |
| Req 12 | LOGIC-03 | Medium |
| Req 13 | UX-02 | Medium |
| Req 14 | UX-03 | Medium |
| Req 15 | BUG-07, DEBT-05 | Medium |
| Req 16 | DEBT-01 | Medium |
| Req 17 | LOGIC-02 | Medium |
| Req 18 | UX-01 | Medium |
| Req 19 | BUG-07, DEBT-05 | Minor |
| Req 20 | DEBT-04 | Minor |
