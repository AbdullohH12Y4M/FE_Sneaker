# SneakerLocal (FE) — Dokumentasi Lengkap

Dokumentasi ini menjelaskan project FE: **struktur code**, **alur logic**, **alur user & admin**, **struktur project**, serta **seluruh endpoint API** yang ada pada backend Next.js (`src/app/api/**`).

---

## 1) Ringkasan Project

Project adalah aplikasi e-commerce single-vendor untuk penjualan sepatu.

Komponen utama:
- **Next.js App Router** (`src/app/**`) untuk halaman UI
- **API routes** (`src/app/api/**/route.ts`) untuk backend
- **Business logic** (`src/server/services/**`)
- **Data access** (`src/server/repositories/**`)
- **Auth** menggunakan cookie JWT (`src/server/auth/jwt.ts`) + middleware UI (`src/middleware.ts`)
- **Database** menggunakan Prisma + PostgreSQL (`prisma/schema.prisma`)

---

## 2) Struktur Project (High-Level)

### 2.1 UI Routes
- `src/app/layout.tsx` : root layout (Navbar, Footer, Providers)
- `src/app/page.tsx` : homepage katalog + filter + fallback mock
- Shop:
  - `src/app/products/[slug]/page.tsx` : detail produk + varian + add-to-cart
  - `src/app/categories/[id]/page.tsx` : detail kategori + grid produk
  - `src/app/search/page.tsx` : search katalog via query params
- User:
  - `src/app/cart/page.tsx` : review & edit cart (Zustand)
  - `src/app/checkout/page.tsx` : submit checkout ke backend
  - `src/app/orders/page.tsx` : daftar order + upload proof + cancel
  - `src/app/orders/[id]/page.tsx` : detail order + upload proof
  - `src/app/profile/page.tsx` : edit profil & password opsional
  - `src/app/login/page.tsx`, `src/app/register/page.tsx`
- Admin:
  - `src/app/admin/**` (dashboard & CRUD via UI)

### 2.2 Komponen
- `src/components/providers.tsx`
- `src/components/layout/Navbar.tsx`, `Footer.tsx`
- `src/components/shop/FilterSidebar.tsx`, `ProductCard.tsx`
- `src/components/dev/DevMockBanner.tsx`

### 2.3 Client State
- `src/store/cart.ts` : cart state + persist localStorage
- `src/store/shop.ts` : store produk/filter (sebagian mungkin kurang dipakai langsung)

### 2.4 Backend API
- `src/app/api/**/route.ts`

---

## 3) Database Schema (Prisma)

File: `prisma/schema.prisma`

Model utama:
- `User` (role CUSTOMER/ADMIN/STAFF)
- `Address`
- `Cart`, `CartItem`
- `Product`, `ProductSKU`, `ProductImage`
- `Inventory`, `InventoryMovement`
- `Order`, `OrderItem`
- `AppSetting` (mis. `shipping_fee`)
- `AuditLog`

Enums:
- `Role`: CUSTOMER, ADMIN, STAFF
- `OrderStatus`: PENDING, WAITING_CONFIRMATION, PAID, SHIPPED, DELIVERED, CANCELLED
- `ShippingType`: DELIVERY, PICKUP
- `PaymentMethod`: MANUAL_TRANSFER, MIDTRANS, COD

---

## 4) Auth & Authorization

### 4.1 Middleware UI: `src/middleware.ts`
Melindungi route UI:
- `/admin/*`:
  - redirect ke `/login?callbackUrl=/admin` jika belum login
  - redirect ke `/` jika bukan ADMIN
- `/checkout`, `/orders`, `/profile`:
  - redirect ke `/login?callbackUrl=<target>` jika belum login
- `/login` dan `/register`:
  - jika sudah login → redirect ke `/`
- Allow public detail kategori:
  - path start `/categories` tapi bukan `/categories`

### 4.2 JWT Cookie Auth: `src/server/auth/jwt.ts`
- `access_token` expiry: 15 menit
- `refresh_token` expiry: 7 hari
- fungsi penting:
  - `getAuthUser(req?)` (auto-refresh access token jika refresh valid)
  - `setAuthCookies(payload)` (httpOnly cookies)
  - `clearAuthCookies()`

### 4.3 Helper Proteksi API: `src/lib/server-auth.ts`
- `requireAuth(req)` → 401 jika tidak login
- `requireAdmin(req)` → 401/403 sesuai role

---

## 5) Unified API Handler & Validasi

File: `src/server/utils/route-handler.ts`

Fitur:
- Auth requirement (`requiredAuth`, `requiredRoles`)
- Validasi JSON request dengan Zod (`options.schema`)
- Unified success response:
  - `{ success: true, message, data }`
- Error mapping:
  - Prisma unique/fk/notfound
  - `handleApiError(error)` untuk format `{ success:false, message, errors? }`

Zod schemas: `src/server/validators/schemas.ts`
- `RegisterSchema`, `RegisterAdminSchema`
- `LoginSchema`
- `UpdateProfileSchema`
- `CartItemSchema`
- `CheckoutSchema`
- `ProductSchema`, `ProductSkuSchema`
- `CategorySchema`, `AddressSchema`

---

## 6) Logic Chain (End-to-End)

### 6.1 Client → API (axios)
File: `src/lib/api.ts`
- mode mock: jika mock aktif panggil `mockHandlers.*`
- interceptor request:
  - dari browser ambil `localStorage.access_token`
  - set header `Authorization: Bearer <token>`
- interceptor response:
  - jika 401 dan bukan mock → hapus token localStorage dan `signOut`

### 6.2 API Route → Service → Repository → DB
Pola umum:
- route handler panggil `createHandler(...)` atau manual (untuk upload/multipart)
- service menjalankan business rules
- repository berinteraksi dengan Prisma (transaction jika perlu)

Contoh paling penting sudah terdokumentasi dari:
- `src/server/services/index.ts`
- `src/server/repositories/index.ts`

---

## 7) User Flow (Customer)

### 7.1 Register & Login
- UI:
  - `src/app/register/page.tsx`
  - `src/app/login/page.tsx`
- API:
  - `POST /api/auth/register/customer`
  - `POST /api/auth/login`

### 7.2 Browsing & Filter
- Homepage:
  - `src/app/page.tsx`
  - pakai `productsApi.listCatalog()` dan fallback mock
- Search:
  - `src/app/search/page.tsx`
  - query params: `category,color,size,minPrice,maxPrice,search`
- FilterSidebar:
  - `src/components/shop/FilterSidebar.tsx`
  - mengubah query params di URL

### 7.3 Product detail & Add to Cart
- `src/app/products/[slug]/page.tsx`
- pilih warna, ukuran, qty
- validasi stok di UI berdasarkan `selectedSku.stock`
- add-to-cart: `useCartStore.addItem(...)`

### 7.4 Cart → Checkout
- Cart:
  - `src/app/cart/page.tsx`
  - edit qty + validasi maxStock
- Checkout:
  - `src/app/checkout/page.tsx`
  - submit: `POST /api/checkout`

### 7.5 Orders & Payment Proof
- Orders list:
  - `src/app/orders/page.tsx`
  - upload proof via `POST /api/orders/[id]/payment-proof`
  - cancel via `DELETE /api/orders/[id]` (status CANCELLED)
- Orders detail:
  - `src/app/orders/[id]/page.tsx`
  - receipt & proof display

---

## 8) Admin Flow

UI:
- `src/app/admin/**`
- middleware melindungi role ADMIN

API penting:
- `GET /api/admin/dashboard`
- `Products CRUD` dan `SKUs/Inventories` via endpoint products/skus/inventories
- `Order management`:
  - `GET /api/orders/admin`
  - `PATCH /api/orders/[id]/status` (ADMIN/STAFF)
  - `GET /api/orders/admin/export`

---

## 9) Endpoint API — Detail Path, Auth, dan Body (yang terverifikasi)

> Format respons cenderung mengikuti `createHandler`:
> - success: `{ success:true, message, data }`
> - error: `{ success:false, message, errors? }`
> 
> Untuk endpoint yang manual (upload/multipart), respons bisa berbeda.

### 9.1 Auth
- `POST /api/auth/login`
- `POST /api/auth/logout` *(terlihat sebagai route `/api/auth/logout/route.ts` memakai `POST`)*
- `GET /api/auth/me`
- `PATCH /api/auth/profile`
- `POST /api/auth/register/customer`
- `POST /api/auth/register/admin`
- `GET /api/auth/users` (admin only)

### 9.2 Admin dashboard
- `GET /api/admin/dashboard` (ADMIN/STAFF)

### 9.3 Brands
- `GET /api/brands` (public)
  - query: `q`, `isActive`
- `POST /api/brands` (ADMIN only)
  - body: `{ name, slug, logoUrl? }`
- `GET /api/brands/[id]` (public)
- `PATCH /api/brands/[id]` (ADMIN)
  - body: `{ name?, slug?, logoUrl?, isActive? }`
- `DELETE /api/brands/[id]` (ADMIN)

### 9.4 Categories
- `GET /api/categories` (createHandler + filtering `isActive`)
- `POST /api/categories` (ADMIN/STAFF)
  - body: sesuai `CategorySchema`
- `GET /api/categories/all` (public)
- `GET /api/categories/[id]` (public)
- `PATCH /api/categories/[id]` (ADMIN/STAFF)
- `DELETE /api/categories/[id]` (ADMIN/STAFF)

### 9.5 Products
- `GET /api/products`
  - query: `q`, `categorySlug`, `brandSlug`, `gender`, `isActive`, `page`, `limit`
- `POST /api/products` (ADMIN/STAFF)
  - body mode:
    - SKU mode: `{ type:'SKU', productId, color, sizeEU, ... , initialStock?, price? }`
    - Product mode: `{ categoryId, brandId?, name, slug, basePrice, ... }`
- `GET /api/products/all` (public)
- `GET /api/products/[slug]` (public)
- `PATCH /api/products/[slug]` (ADMIN/STAFF)
  - body: bebas update product field
- `DELETE /api/products/[slug]` (ADMIN/STAFF)
- `POST /api/products/[slug]/image` (ADMIN)
  - multipart form-data:
    - file: `file`
    - isPrimary: `isPrimary` (optional)
- `DELETE /api/products/[slug]/image?imageId=` (ADMIN)

### 9.6 SKUs
- `PATCH /api/skus/[id]` (ADMIN)
- `DELETE /api/skus/[id]` (ADMIN)

### 9.7 Inventories (stock)
- `PATCH /api/inventories/[skuId]` (ADMIN)
  - body: `{ type:'STOCK'?, stock }`

### 9.8 Cart
- `GET /api/cart` (auth)
- `POST /api/cart` (auth)
  - body: `{ productSkuId, quantity }`
- `PATCH /api/cart/[id]` (auth)
  - body: `{ quantity }`
- `DELETE /api/cart/[id]` (auth)

### 9.9 Checkout
- `POST /api/checkout` (auth)
  - body: sesuai `CheckoutSchema`

### 9.10 Orders
- `GET /api/orders` (auth)
- `GET /api/orders/[id]` (auth)
- `DELETE /api/orders/[id]` (auth)
- `POST /api/orders/[id]/payment-proof` (auth, multipart file)
- `GET /api/orders/[id]/receipt` (auth) → response text/plain attachment
- `PATCH /api/orders/[id]/status` (ADMIN/STAFF)

### 9.11 Admin Orders
- `GET /api/orders/admin` (ADMIN/STAFF)
- `GET /api/orders/admin/export` (ADMIN only)
  - query: `format=csv|json`, `status`, `startDate`, `endDate`

### 9.12 Upload
- `POST /api/upload` (ADMIN/STAFF)
  - multipart form-data: `file`

### 9.13 Users
- `GET/PATCH /api/users/profile` (auth)

---

## 10) Komponen UI yang Mempengaruhi Flow Utama

### 10.1 `FilterSidebar`
- Mengubah URL query params untuk filter katalog

### 10.2 `ProductCard`
- Menampilkan label sold out/discount
- swatch warna dari sku
- tombol navigasi ke detail

### 10.3 `CartStore`
- persist cart ke localStorage (`zustand persist`)
- merge dengan server cart tersedia (`mergeWithServerCart`) meski belum terlihat penggunaannya langsung di pages customer.

---

## 11) Catatan Kualitas / Perbaikan Potensial

- `src/store/shop.ts` ada fungsi `fetchProducts` tapi kemungkinan tidak dipakai karena pages sudah fetch sendiri.
  - ada TODO cleanup di `TODO.md`.
- Review pada `ProductDetailPage` masih mock.

---

## 12) Referensi File Penting

- Auth UI: 
  - `src/app/login/page.tsx`
  - `src/app/register/page.tsx`
- Root layout:
  - `src/app/layout.tsx`
- Providers:
  - `src/components/providers.tsx`
- Middleware:
  - `src/middleware.ts`
- Auth JWT:
  - `src/server/auth/jwt.ts`
- Unified handler:
  - `src/server/utils/route-handler.ts`
- Services/Repositories:
  - `src/server/services/index.ts`
  - `src/server/repositories/index.ts`
- DB schema:
  - `prisma/schema.prisma`

---

## 13) Cara Jalankan (umum)

- Pastikan environment variables untuk database & JWT secret sudah diset.
- Prisma generate/seed sesuai package.json.

(Detail command dijelaskan di file project (mis. README root/konfig), dan bisa ditambahkan bila kamu ingin.)

