# 🛠️ SneakerLocal — Analisa Menyeluruh & Rencana Perbaikan

> Analisa dilakukan terhadap seluruh codebase: middleware, API routes, Zustand stores,
> halaman admin, halaman publik, Prisma schema, dan komponen layout.
> Dokumen ini menggabungkan dua sumber analisa: pembacaan langsung kode sumber (confirmed bugs)
> dan analisa arsitektur menyeluruh.

---

## 📊 Ringkasan Temuan

| Kategori | Jumlah |
|---|---|
| 🔴 Bug Kritis (broken/runtime error) | 7 |
| 🟠 Inkonsistensi Logika Bisnis | 5 |
| 🟡 Masalah UX / User Flow | 6 |
| 🟢 Technical Debt / Hardcoded | 5 |
| **Total** | **23 item** |

---

## 🔴 BUG KRITIS — Wajib Diperbaiki Sebelum Launch

### BUG-01 · Navbar Search: Gambar Tidak Muncul di Hasil Pencarian
**File:** `src/components/layout/Navbar.tsx`

**Root Cause (dikonfirmasi dari kode):**
Fungsi `fetchSearch` memanggil `productsApi.getAll()` **tanpa parameter** — hits endpoint `/api/products` (paginated) yang hanya mengembalikan data produk dasar, tanpa relasi `images`. Selain itu, response dibaca dari path yang salah:

```ts
// Navbar.tsx:62 — SALAH: getAll() tanpa q/limit, fetch semua produk
const res = await productsApi.getAll();

// Path salah — /api/products mengembalikan { success, data: { items: [] } }
// tapi kode mencari res.data?.products ?? res.data?.items → selalu undefined
const all = res.data?.products ?? res.data?.items ?? res.data?.itemsList ?? res.data ?? [];

// Navbar.tsx:136 — images[0] selalu undefined → broken image
<img src={p.images?.[0]} alt={p.name} />
```

**Dua masalah sekaligus:**
1. Endpoint yang salah: `/api/products` tidak include `images` — harus `/api/products/all`
2. Response path yang salah: harus `res.data.data.items` untuk endpoint `/api/products`, atau pakai `getAllPublic` yang returnnya `{ items: [] }` langsung
3. Tidak ada `parseProductsList()` — gambar dari format `[{id, url}]` tidak dinormalisasi ke string

**Perbaikan:**
```ts
// Ganti dengan getAllPublic yang hits /api/products/all (include images + SKUs)
const res = await productsApi.getAllPublic({ q: query, limit: 5 });
// getAllPublic → /api/products/all → { items: [...] } → parseListPayload tangani ini
const items = parseProductsList(res.data); // normalisasi images sekaligus
```

---

### BUG-02 · Admin: STAFF Tidak Bisa Akses Halaman (Middleware Block)
**Files:** `src/middleware.ts`, `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`

**Root Cause — Tiga lapis konflik:**

1. **Middleware** (`baris 99`): `const isAdmin = session?.user?.role === 'ADMIN'` → STAFF diblokir di middleware, tidak pernah sampai ke layout
2. **Admin layout** (`baris 18`): Sudah benar — cek `'ADMIN' || 'STAFF'`, tapi tidak pernah tercapai karena middleware menghalangi
3. **Admin dashboard page** (`baris 24 & 85`): Hanya load data/render jika `role === 'ADMIN'`

**Akibat:** Role STAFF di schema Prisma ada, tapi tidak bisa digunakan sama sekali — role ini "mati".

**Perbaikan Middleware:**
```ts
// middleware.ts:99 — SEBELUM
const isAdmin = session?.user?.role === 'ADMIN';
if (!isAdmin) { return NextResponse.redirect(...) }

// SESUDAH
const isStaffOrAdmin = ['ADMIN', 'STAFF'].includes(session?.user?.role ?? '');
if (!isStaffOrAdmin) { return NextResponse.redirect(...) }
```

**Perbaikan Admin Page:** Ubah semua kondisi `role !== 'ADMIN'` menjadi `!['ADMIN', 'STAFF'].includes(role)`.

---

### BUG-03 · Inventaris API: STAFF Tidak Bisa Update Stok
**File:** `src/app/api/inventories/[skuId]/route.ts`

**Root Cause:**
```ts
const authResult = await requireAdmin(req); // Hanya izinkan ADMIN
```
`requireAdmin` di `server-auth.ts` cek `user.role !== 'ADMIN'` → STAFF mendapat 403. Padahal `/api/orders/admin/route.ts` sudah pakai `requiredRoles: ['ADMIN', 'STAFF']`. Inkonsisten.

**Perbaikan:**
```ts
// Ganti requireAdmin dengan createHandler + requiredRoles
export const PATCH = createHandler(
  { requiredRoles: ['ADMIN', 'STAFF'] },
  async (req, { params }) => { ... }
);
```
Atau tambah `requireAdminOrStaff()` di `server-auth.ts`.

---

### BUG-04 · Admin Dashboard: STAFF Tidak Dapat Data (Double Block)
**File:** `src/app/admin/page.tsx`

**Root Cause — dua kondisi yang memblokir STAFF:**
```ts
// Baris 24 — STAFF dikecualikan dari fetch
if (!session?.user || session.user.role !== 'ADMIN') {
  setLoading(false);
  return; // STAFF tidak bisa fetch orders
}

// Baris 85 — STAFF di-render null
if (!session || session.user.role !== 'ADMIN') {
  return null; // Halaman kosong untuk STAFF
}
```
Meskipun middleware diperbaiki (BUG-02), `admin/page.tsx` sendiri masih memblokir STAFF secara client-side.

**Perbaikan:** Ubah kedua kondisi menjadi `!['ADMIN', 'STAFF'].includes(session?.user?.role ?? '')`.

---

### BUG-05 · Admin Users Page: Field `name` Tidak Ditampilkan
**File:** `src/app/admin/users/page.tsx`

**Root Cause:** Interface `User` lokal tidak include `name`, dan `role` tidak include `'STAFF'`:
```ts
interface User {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN'; // ← 'STAFF' hilang
  createdAt: string;
  updatedAt: string; // ← tidak ada di response server
  // name: string? ← HILANG
}
```
Padahal API `/api/auth/users` sudah `select: { id: true, email: true, name: true, role: true, createdAt: true }`. Kolom nama tidak ditampilkan di tabel.

**Perbaikan:**
```ts
interface User {
  id: string;
  email: string;
  name: string | null; // ← tambahkan
  role: 'CUSTOMER' | 'ADMIN' | 'STAFF'; // ← tambahkan STAFF
  createdAt: string;
  // hapus updatedAt — tidak di-return server
}
```
Tambah kolom `Nama` ke tabel. Tampilkan `user.name ?? '-'`.

---

### BUG-06 · Export Orders: Endpoint Ada, STAFF Tidak Bisa Akses
**File:** `src/app/api/orders/admin/export/route.ts`

> **KOREKSI:** Endpoint `/api/orders/admin/export` **SUDAH ADA** — tidak 404.
> Yang perlu diperbaiki hanya akses STAFF.

```ts
const authResult = await requireAdmin(req); // Hanya ADMIN → STAFF dapat 403
```

**Perbaikan:** Ganti `requireAdmin` dengan `requiredRoles: ['ADMIN', 'STAFF']`.

---

### BUG-07 · `normalizeProduct` Duplikat: `utils.ts` vs `api-helpers.ts`
**Files:** `src/lib/utils.ts`, `src/lib/api-helpers.ts`

**Root Cause:** Ada dua fungsi `normalizeProduct` dengan signature berbeda:

| File | Signature | Return type | Handle `{url}[]` images? |
|---|---|---|---|
| `utils.ts` | `(input, productId)` | `Record<string, unknown>` | ❌ Tidak |
| `api-helpers.ts` | `(product)` | `Product` (typed) | ✅ Ya |

Halaman admin yang import dari `utils.ts` bisa mendapat data tidak konsisten. Comment di `utils.ts:39` sendiri mengakui ini.

**Perbaikan:** Hapus `normalizeProduct` dari `utils.ts`. Arahkan semua import ke `api-helpers.ts`.

---

## 🟠 INKONSISTENSI LOGIKA BISNIS

### LOGIC-01 · Checkout: Total yang Ditampilkan ≠ Total yang Dibayar
**File:** `src/app/checkout/page.tsx`

```ts
const subtotal = getTotalPrice();
const total = subtotal; // BE calculates shipping fee from DB
// UI menampilkan formatPrice(total) — identik dengan subtotal, ongkir tidak termasuk
```

UI menampilkan total = subtotal. Setelah order dibuat, server menambahkan ongkir. User tidak tahu total akhir sampai melihat detail order.

**Akibat UX:** User pikir total = Rp 500.000, order tersimpan Rp 510.000 → shock saat lihat invoice.

**Solusi minimum (tidak perlu endpoint baru):**
```ts
// Tampilkan estimasi berbasis MALANG_DISTRICTS yang sudah ada (flat Rp 10.000)
const FLAT_SHIPPING_FEE = 10_000;
const estimatedShipping = shippingType === 'DELIVERY' ? FLAT_SHIPPING_FEE : 0;
const estimatedTotal = subtotal + estimatedShipping;
```
Tampilkan `estimatedTotal` dengan label "Estimasi Total (termasuk ongkir)".

---

### LOGIC-02 · Cart: Tidak Ada Server-Side Cart Sync Setelah Login
**File:** `src/store/cart.ts`

`mergeWithServerCart` sudah diimplementasi di Zustand store, tapi tidak pernah dipanggil di mana pun dalam codebase. Schema DB sudah punya model `Cart` dan `CartItem`. Artinya:
- Cart DB tidak dipakai sama sekali
- Guest cart tidak pernah di-merge dengan server
- User login di device lain = cart kosong

Perlu dicek apakah `/api/cart` route sudah ada.

---

### LOGIC-03 · Order Upload Proof: Tidak Bisa Upload Ulang Saat WAITING_CONFIRMATION
**File:** `src/app/orders/[id]/page.tsx`

```ts
// Kondisi saat ini — upload hanya saat PENDING tanpa proof
const canUploadProof = order.status === 'PENDING' && !order.paymentProofUrl;
```

Jika user upload salah (transfer amount yang salah), status berubah ke `WAITING_CONFIRMATION` dan form upload menghilang — tidak bisa ganti bukti.

**Perbaikan:**
```ts
// Izinkan ganti bukti saat WAITING_CONFIRMATION juga
const canUploadProof = order.status === 'PENDING' ||
  (order.status === 'WAITING_CONFIRMATION'); // tampilkan "Ganti Bukti"
```

---

### LOGIC-04 · Admin Dashboard: Status `DELIVERED` Tidak Ada di List
**File:** `src/app/admin/page.tsx`

```ts
const ORDER_STATUSES = ['PENDING', 'WAITING_CONFIRMATION', 'PAID', 'SHIPPED', 'CANCELLED'];
// 'DELIVERED' tidak ada!
```

Admin tidak bisa menandai pesanan sebagai sudah diterima. Status ini juga dipakai di kalkulasi `totalRevenue` (`DELIVERED` termasuk), tapi tidak bisa di-set dari UI.

**Perbaikan:** Tambah `'DELIVERED'` ke array. Pertimbangkan konfirmasi sebelum ubah status.

---

### LOGIC-05 · Home Page Category Filter: Case-Sensitive Mismatch
**File:** `src/app/page.tsx`

```ts
// Navbar kirim: /?category=SNEAKERS (uppercase hardcode)
// Filter di page.tsx membandingkan:
productCategory.toLowerCase() !== category.toLowerCase()
// product.category dari DB = 'Sneakers' (nama), category dari URL = 'SNEAKERS'
// 'sneakers' === 'sneakers' ✅ — ini sebenarnya sudah OK dengan toLowerCase
// TAPI jika nama di DB = 'Sepatu Sneakers' → tidak match
```

Filter berfungsi hanya jika nama kategori di DB persis sama (case-insensitive) dengan slug URL. Sebaiknya bandingkan dengan `slug`, bukan `name`.

---

## 🟡 MASALAH UX / USER FLOW

### UX-01 · Foto Profil Disimpan di `localStorage` — Reset Saat Ganti Browser
**File:** `src/app/profile/page.tsx`

```ts
const saved = localStorage.getItem('profile_image'); // base64 besar!
localStorage.setItem('profile_image', result);
```

Foto tidak tersimpan di server. Reset jika: browser lain, clear cache, private mode. Foto base64 juga besar — memperlambat localStorage.

**Fix proper:** Tambah `avatarUrl String?` ke schema `User`. Upload via `/api/upload` yang sudah ada.

---

### UX-02 · Orders Page: `loadOrder` di `handleUpload` Tidak Ada Error Handling
**File:** `src/app/orders/[id]/page.tsx`

```ts
const handleUpload = async (file: File) => {
  setUploading(true);
  await ordersApi.uploadProof(id, file, uploadNote);
  await loadOrder(); // ← loadOrder tidak punya try-catch di sini!
  setNote('');
};
```

Jika `loadOrder()` gagal setelah upload berhasil, error tidak di-catch dan di-set ke state — UI freeze tanpa pesan.

---

### UX-03 · Pembatalan Pesanan Menggunakan `confirm()` Native
**File:** `src/app/orders/page.tsx` (orders list)

```ts
if (!confirm(`Batalkan pesanan #${order.id}?`)) return;
```

`window.confirm()` tidak bisa di-style, blokir JS thread, dan diblokir di beberapa environment (iframe, Electron, mobile). Harus diganti modal konfirmasi custom.

---

### UX-04 · Navbar: Active State Kategori Tidak Terdeteksi
**File:** `src/components/layout/Navbar.tsx`

```ts
// SALAH: pathname hanya berisi path '/', bukan query string
pathname === link.href  // '/' === '/?category=SNEAKERS' → selalu false
```

Link kategori tidak pernah mendapat `navLinkActive` class.

**Perbaikan:**
```ts
import { usePathname, useSearchParams } from 'next/navigation';
const searchParams = useSearchParams();
const isActive = (link: { href: string }) => {
  const url = new URL(link.href, 'http://x');
  if (url.pathname !== pathname) return false;
  const cat = url.searchParams.get('category');
  return cat ? searchParams.get('category') === cat : !searchParams.get('category');
};
```

---

### UX-05 · Search Navbar: Fetch Semua Produk Setiap Keystroke
Sudah dibahas di BUG-01. `fetchSearch` fetch semua produk setiap 300ms. Dengan 1000 produk, ini kirim ~1000 records ke client hanya untuk menampilkan 5 hasil.

---

### UX-06 · Orders Page: Tidak Ada Pagination
**File:** `src/app/orders/page.tsx`

```ts
const response = await ordersApi.getMyOrders(); // Tidak ada limit/offset
```

Jika user punya banyak pesanan, semua di-load sekaligus. Tidak optimal untuk pengguna jangka panjang.

---

## 🟢 TECHNICAL DEBT / HARDCODED

### DEBT-01 · Kategori Navbar Hardcoded
**File:** `src/components/layout/Navbar.tsx`

```ts
const NAV_LINKS = [
  { href: '/?category=SNEAKERS', label: 'Sneakers' },
  { href: '/?category=CASUAL', label: 'Kasual' },
  // ...
];
```

Jika admin menambah kategori baru via admin panel, navbar tidak berubah tanpa edit kode. Harus fetch dari `/api/categories`.

---

### DEBT-02 · `MALANG_DISTRICTS` Hardcoded di `utils.ts`
**File:** `src/lib/utils.ts`

Daftar kecamatan hardcoded 5 item. Jika area pengiriman berubah, harus edit kode dan deploy ulang. Perlu tabel `ShippingZone` atau pakai model `AppSetting` yang sudah ada di DB.

---

### DEBT-03 · `CATEGORY_LABELS` di `utils.ts` Tidak Sinkron dengan DB
**File:** `src/lib/utils.ts`

```ts
export const CATEGORY_LABELS: Record<string, string> = {
  SNEAKERS: 'Sneakers',
  CASUAL: 'Kasual',
  // ...
};
```

Tidak pernah di-fetch dari server. Jika nama kategori di DB berubah, label di FE tidak sinkron.

---

### DEBT-04 · Home Page Menggunakan `any[]` untuk State Products
**File:** `src/app/page.tsx`

```ts
const [products, setProducts] = useState<any[]>([]);
```

Tipe `any` menghilangkan type safety. Harus menggunakan `Product[]` dari `@/types`.

---

### DEBT-05 · `normalizeProduct` Duplikat
Sudah dibahas di BUG-07. Versi di `utils.ts` harus dihapus.

---

## 📋 PRIORITAS PERBAIKAN & RENCANA IMPLEMENTASI

### 🚀 Fase 1 — Bug Kritis (Sprint 1, ~2–3 hari)

| # | Item | File(s) | Effort |
|---|---|---|---|
| 1 | BUG-02: Middleware izinkan STAFF ke `/admin` | `middleware.ts` | S |
| 2 | BUG-04: Admin page render + fetch untuk STAFF | `admin/page.tsx` | S |
| 3 | BUG-03: Inventaris API izinkan STAFF | `api/inventories/[skuId]/route.ts` | S |
| 4 | BUG-06: Export API izinkan STAFF | `api/orders/admin/export/route.ts` | S |
| 5 | BUG-01: Navbar search gunakan `getAllPublic` + `parseProductsList` | `Navbar.tsx` | M |
| 6 | BUG-05: Admin users: tambah kolom name + fix role type | `admin/users/page.tsx` | S |
| 7 | UX-04: Navbar active state gunakan `useSearchParams` | `Navbar.tsx` | S |
| 8 | LOGIC-04: Tambah `DELIVERED` ke `ORDER_STATUSES` | `admin/page.tsx` | S |

### 🔧 Fase 2 — Logika & UX (Sprint 2, ~3–5 hari)

| # | Item | File(s) | Effort |
|---|---|---|---|
| 9 | LOGIC-01: Checkout tampilkan estimasi total + ongkir | `checkout/page.tsx` | M |
| 10 | LOGIC-03: Upload proof juga saat WAITING_CONFIRMATION | `orders/[id]/page.tsx` | S |
| 11 | UX-02: `handleUpload` tambah error handling di `loadOrder` | `orders/[id]/page.tsx` | S |
| 12 | UX-03: Ganti `window.confirm` dengan modal konfirmasi custom | `orders/page.tsx` | M |
| 13 | LOGIC-05: Category filter pakai slug bukan name | `page.tsx`, `Navbar.tsx` | M |
| 14 | DEBT-04: Ganti `any[]` dengan typed `Product[]` | `page.tsx`, `search/page.tsx` | S |
| 15 | BUG-07 / DEBT-05: Hapus `normalizeProduct` duplikat dari `utils.ts` | `utils.ts` | S |

### 📦 Fase 3 — Dynamic Data & Expandability (Sprint 3, ~1 minggu)

| # | Item | File(s) | Effort |
|---|---|---|---|
| 16 | DEBT-01: Navbar kategori fetch dari `/api/categories` | `Navbar.tsx` | M |
| 17 | DEBT-02: Districts fetch dari AppSetting/API (buat endpoint baru) | `utils.ts`, `checkout/page.tsx` | L |
| 18 | UX-01: Foto profil upload ke server (endpoint + DB schema) | `profile/page.tsx`, `schema.prisma` | L |
| 19 | LOGIC-02: Cart sync dengan server setelah login | `store/cart.ts`, buat `/api/cart` | L |
| 20 | UX-06: Tambah pagination di orders page | `orders/page.tsx` | M |

---

## 🔑 Perubahan File per Fase

### Fase 1 — File yang Diubah

**`[MODIFY] middleware.ts`**
- Tambah variabel `isStaffOrAdmin = ['ADMIN', 'STAFF'].includes(session?.user?.role ?? '')`
- Ganti semua `!isAdmin` dengan `!isStaffOrAdmin` di guard `/admin` routes

**`[MODIFY] src/app/admin/page.tsx`**
- Baris 24: Ubah role check sertakan STAFF → `!['ADMIN', 'STAFF'].includes(role)`
- Baris 85: Ubah render condition sertakan STAFF
- Baris 12: Tambah `'DELIVERED'` ke `ORDER_STATUSES`

**`[MODIFY] src/app/api/inventories/[skuId]/route.ts`**
- Ganti `requireAdmin` dengan `createHandler({ requiredRoles: ['ADMIN', 'STAFF'] })`

**`[MODIFY] src/app/api/orders/admin/export/route.ts`**
- Ganti `requireAdmin` dengan `requiredRoles: ['ADMIN', 'STAFF']`

**`[MODIFY] src/lib/server-auth.ts`** *(jika diperlukan)*
- Tambah `requireAdminOrStaff()` sebagai shorthand untuk role check ADMIN | STAFF

**`[MODIFY] src/components/layout/Navbar.tsx`**
- Ganti `productsApi.getAll()` dengan `productsApi.getAllPublic({ q: query, limit: 5 })`
- Ganti pembacaan manual array dengan `parseProductsList(res.data)` — normalisasi images otomatis
- Tambah `useSearchParams()` untuk active state kategori
- Tambah `router.push('/search?q=...')` saat Enter ditekan di search input

**`[MODIFY] src/app/admin/users/page.tsx`**
- Tambah `name: string | null` ke interface `User`
- Tambah `'STAFF'` ke union type `role`
- Hapus `updatedAt` dari interface (tidak di-return server)
- Tambah kolom "Nama" ke tabel, tampilkan `user.name ?? '-'`

---

## ✅ Checklist Verifikasi

### Automated
- [ ] `tsc --noEmit` — tidak ada TypeScript error
- [ ] `npm run build` — tidak ada compile error

### Manual (Fase 1)
- [ ] Login sebagai STAFF → bisa akses `/admin`
- [ ] STAFF bisa update stok di inventaris (tidak dapat 403)
- [ ] STAFF bisa export orders (tidak dapat 403)
- [ ] Navbar search → gambar produk muncul di dropdown
- [ ] Navbar search Enter → redirect ke `/search?q=...`
- [ ] Admin users page → kolom nama muncul, role STAFF ditampilkan benar
- [ ] Admin dashboard → tombol status `DELIVERED` muncul

### Manual (Fase 2)
- [ ] Checkout DELIVERY → tampilkan estimasi ongkir sebelum submit
- [ ] Checkout PICKUP → ongkir Rp0
- [ ] Order status WAITING_CONFIRMATION → tombol "Ganti Bukti" muncul
- [ ] Order upload gagal → pesan error muncul (tidak freeze)
- [ ] Kategori navbar aktif → highlight sesuai URL param
- [ ] Batalkan pesanan → modal konfirmasi custom (bukan `window.confirm`)

---

## 🏗️ Arsitektur yang Direkomendasikan untuk Expandability

```
src/
├── app/
│   ├── api/
│   │   ├── inventories/[skuId]/  ← [MODIFY] requireAdminOrStaff
│   │   ├── orders/admin/export/  ← [MODIFY] requireAdminOrStaff
│   │   ├── shipping-zones/       ← [NEW] Endpoint districts dinamis
│   │   └── cart/                 ← [NEW] Server-side cart API
├── components/layout/
│   └── Navbar.tsx                ← [MODIFY] search + active state + dynamic categories
├── lib/
│   ├── server-auth.ts            ← [MODIFY] Tambah requireAdminOrStaff()
│   └── utils.ts                  ← [MODIFY] Hapus normalizeProduct duplikat
├── middleware.ts                  ← [MODIFY] isStaffOrAdmin guard
└── store/
    └── cart.ts                   ← [MODIFY] Wire mergeWithServerCart ke login flow
```

---

> **⚠️ PENTING:** Fase 1 harus selesai sebelum produk bisa dipresentasikan/diluncurkan.
> Tanpa perbaikan middleware + navbar search, dua fitur utama tidak berfungsi:
> admin panel untuk STAFF dan search produk dengan gambar.
>
> **⛔ JANGAN** tambah user STAFF baru sebelum BUG-02, BUG-03, dan BUG-04 diperbaiki —
> user STAFF tidak bisa melakukan apa pun saat ini.
