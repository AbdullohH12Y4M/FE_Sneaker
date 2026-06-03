# Backend API Documentation for SneakerLocal Frontend

> **Base URL:** `https://sneakerlocal.up.railway.app`  
> **Authentication:** Bearer JWT (`access_token` from `POST /auth/login`)  
> **Frontend:** Next.js (App Router) + Zustand + Axios

---

## Table of Contents

1. [General Notes](#general-notes)
2. [TypeScript Types](#typescript-types)
3. [Auth API](#auth-api)
4. [Categories API](#categories-api)
5. [Products API](#products-api)
6. [Orders API](#orders-api)
7. [Error Handling](#error-handling)
8. [Frontend Integration Checklist](#frontend-integration-checklist)

---

## General Notes

- Semua endpoint publik bisa diakses tanpa header `Authorization`.
- Endpoint yang membutuhkan auth harus menyertakan header: `Authorization: Bearer <access_token>`.
- Token diambil dari field top-level `access_token` di response `POST /auth/login`.
- Format harga: Rupiah (integer), contoh: `85000`.
- Format tanggal: ISO 8601 UTC, contoh: `2026-06-03T02:17:57.533Z`.
- CUID ID: string dimulai dengan `cl` atau `cmp`, contoh: `clxxxxxxxxxxxxxxxxxxxxxxxxx`.
- Query params untuk filter mendukung kombinasi (AND logic di backend).

### Endpoint Penting yang Perlu Diperhatikan

| Endpoint | Catatan |
|----------|---------|
| `GET /products` | Publik, dengan pagination + filter |
| `GET /products/all` | Publik, mengambil semua produk aktif (tanpa pagination), cocok untuk store Zustand |
| `GET /products/{slug}` | Publik, detail produk + SKU + inventory |
| `GET /categories` | Publik, daftar kategori aktif |
| `GET /all` | Publik, mengambil semua produk dan kategori aktif tanpa filter |
| `POST /checkout` | Wajib auth, stok berkurang atomic |
| `GET /orders` | Wajib auth, pesanan milik user yang login |

---

## TypeScript Types

```typescript
// ─── Shared ────────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: T[];
}

// ─── Auth ───────────────────────────────────────────────────────────────────
export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: 'CUSTOMER' | 'ADMIN';
  };
}

export interface RegisterResponse {
  user: {
    id: string;
    email: string;
    role: 'CUSTOMER' | 'ADMIN';
  };
}

// ─── Category ───────────────────────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── SKU / Inventory ────────────────────────────────────────────────────────
export interface ProductSKU {
  id: string;
  productId: string;
  color: string;
  colorHex: string;
  size: number;
  stock: number;
  price?: number;
}

// ─── Product ────────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  skus: ProductSKU[];
}

// ─── Cart ───────────────────────────────────────────────────────────────────
export interface CartItem {
  skuId: string;
  productId: string;
  productName: string;
  productSlug: string;
  image: string;
  color: string;
  colorHex: string;
  size: number;
  price: number;
  quantity: number;
  maxStock: number;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

// ─── Order ──────────────────────────────────────────────────────────────────
export type OrderStatus = 'PENDING' | 'WAITING_CONFIRMATION' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type ShippingType = 'DELIVERY' | 'PICKUP';
export type PaymentMethod = 'MANUAL_TRANSFER' | 'MIDTRANS' | 'COD';

export interface ShippingZone {
  id: string;
  district: string;
  price: number;
}

export interface OrderItem {
  id: string;
  skuId: string;
  quantity: number;
  price: number;
  sku: ProductSKU & { product: Product };
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  items: OrderItem[];
  totalPrice: number;
  shippingType: ShippingType;
  shippingAddress?: string;
  shippingDistrict?: string;
  shippingFee: number;
  paymentMethod: PaymentMethod;
  paymentProofUrl?: string;
  paymentExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Form Inputs ────────────────────────────────────────────────────────────
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
}

export interface CheckoutForm {
  items: { skuId: string; quantity: number }[];
  shippingType: ShippingType;
  district?: string;
  shippingAddress?: string;
  paymentMethod: PaymentMethod;
}

export interface ProductCreatePayload {
  type: 'PRODUCT';
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  imageUrl?: string;
  isActive?: boolean;
}

export interface SkuCreatePayload {
  type: 'SKU';
  productId: string;
  color: string;
  size: string;
  initialStock: number;
}

export interface SkuUpdatePayload {
  type: 'SKU';
  color?: string;
  size?: string;
}

export interface InventoryUpdatePayload {
  type: 'STOCK';
  stock: number;
}

export interface OrderStatusUpdatePayload {
  status: OrderStatus;
  note?: string;
}
```

---

## Auth API

### `POST /auth/register/customer`
Registrasi pelanggan baru (Customer).

**Auth:** Tidak diperlukan

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response `201`:**
```json
{
  "user": {
    "id": "clxxxxxxxxxxxxxxxxxxxxxxxxx",
    "email": "user@example.com",
    "role": "CUSTOMER"
  }
}
```

**Error `400`:** Email sudah terdaftar atau validasi gagal.

---

### `POST /auth/register/admin`
Registrasi admin baru.

**Auth:** Tidak diperlukan

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response `201`:**
```json
{
  "user": {
    "id": "clxxxxxxxxxxxxxxxxxxxxxxxxx",
    "email": "admin@example.com",
    "role": "ADMIN"
  }
}
```

**Error `400`:** Email sudah terdaftar atau validasi gagal.

---

### `POST /auth/login`
Login pengguna, mengembalikan JWT access token.

**Auth:** Tidak diperlukan

**Request Body:**
```json
{
  "email": "admin@gmail.com",
  "password": "123456"
}
```

**Response `200`:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxxxxxxxxxxxxxxxxxxxxxxxxx",
    "email": "user@example.com",
    "role": "CUSTOMER"
  }
}
```

**Error `401`:** Email atau password salah.

> **Penting:** Simpan `access_token` dari top-level response ke `localStorage` dengan key `access_token`. Axios interceptor di FE akan otomatis membacanya.

---

## Categories API

### `GET /categories`
Daftar semua kategori (publik). Mendukung pagination dan filter.

**Auth:** Tidak diperlukan

**Query Params:**
| Param | Type | Deskripsi |
|-------|------|-----------|
| `q` | string | Kata kunci pencarian (nama/slug) |
| `slug` | string | Filter berdasarkan slug |
| `isActive` | boolean | Filter kategori aktif/non-aktif |
| `page` | number | Nomor halaman (dimulai dari 1) |
| `limit` | number | Jumlah item per halaman (default: 20) |

**Contoh:**
```
GET /categories?isActive=true&limit=20
```

**Response `200`:**
```json
{
  "page": 1,
  "limit": 20,
  "total": 2,
  "items": [
    {
      "id": "cmpxdikcw0001ms12pprcv36b",
      "name": "Sandal",
      "slug": "sandal",
      "isActive": true,
      "createdAt": "2026-06-03T01:14:13.520Z",
      "updatedAt": "2026-06-03T01:14:13.520Z"
    }
  ]
}
```

---

### `POST /categories` (Admin)
Buat kategori baru.

**Auth:** Wajib (`Authorization: Bearer <token>`)

**Request Body:**
```json
{
  "name": "Kaos Polos",
  "slug": "kaos-polos"
}
```

**Response `201`:**
```json
{
  "id": "cmpxflien0000oc12z4mz8oeo",
  "name": "Kaos Polos",
  "slug": "kaos-polos",
  "isActive": true,
  "createdAt": "2026-06-03T02:12:30.095Z",
  "updatedAt": "2026-06-03T02:12:30.095Z"
}
```

**Error `400`:** Slug sudah ada atau validasi gagal.  
**Error `401`:** Token tidak valid atau tidak ada.  
**Error `403`:** Hanya Admin yang bisa mengakses.

---

### `GET /categories/{id}`
Detail satu kategori berdasarkan ID.

**Auth:** Tidak diperlukan

**Response `200`:**
```json
{
  "id": "cmpxdikcw0001ms12pprcv36b",
  "name": "Sandal",
  "slug": "sandal",
  "isActive": true,
  "createdAt": "2026-06-03T01:14:13.520Z",
  "updatedAt": "2026-06-03T01:14:13.520Z"
}
```

**Error `404`:** Kategori tidak ditemukan.

---

### `PATCH /categories/{id}` (Admin)
Update kategori.

**Auth:** Wajib

**Request Body:**
```json
{
  "name": "Kaos Premium",
  "slug": "kaos-premium",
  "isActive": true
}
```

**Response `200`:** Data kategori yang telah diupdate.  
**Error `400`:** Slug sudah ada atau validasi gagal.  
**Error `401`:** Token tidak valid.  
**Error `403`:** Hanya Admin.  
**Error `404`:** Kategori tidak ditemukan.

---

### `DELETE /categories/{id}` (Admin)
Hapus kategori.

**Auth:** Wajib

**Response `200`:**
```json
{
  "success": false,
  "message": "Category does not exist",
  "data": null
}
```

**Error `401/403/404`:** sesuai standar.

---

## Products API

### `GET /products`
Daftar produk aktif (publik) dengan pagination dan filter.

**Auth:** Tidak diperlukan

**Query Params:**
| Param | Type | Deskripsi |
|-------|------|-----------|
| `q` | string | Kata kunci (nama/slug/deskripsi) |
| `categorySlug` | string | Filter berdasarkan slug kategori |
| `color` | string | Filter berdasarkan warna SKU |
| `size` | string | Filter berdasarkan ukuran SKU |
| `minPrice` | number | Harga minimum (Rupiah) |
| `maxPrice` | number | Harga maksimum (Rupiah) |
| `page` | number | Nomor halaman |
| `limit` | number | Jumlah item per halaman |

**Contoh:**
```
GET /products?q=kaos&categorySlug=kaos-polos&color=Hitam&size=L&minPrice=50000&maxPrice=200000&page=1&limit=20
```

**Response `200`:**
```json
{
  "page": 1,
  "limit": 20,
  "total": 50,
  "items": [
    {
      "id": "string",
      "categoryId": "string",
      "name": "Kaos Polos Hitam",
      "slug": "kaos-polos-hitam",
      "description": "string",
      "basePrice": 85000,
      "imageUrl": "string",
      "isActive": true,
      "createdAt": "2026-06-03T02:17:57.533Z",
      "updatedAt": "2026-06-03T02:17:57.533Z",
      "category": {
        "id": "string",
        "name": "string",
        "slug": "string"
      }
    }
  ]
}
```

> **Catatan FE:** Response items di atas tidak menyertakan array `skus`. Untuk mendapatkan SKU, gunakan `GET /products/{slug}`.

---

### `GET /products/all`
Ambil semua produk aktif tanpa filter dan tanpa pagination.

**Auth:** Tidak diperlukan

**Response `200`:**
```json
{
  "items": [
    {
      "id": "string",
      "categoryId": "string",
      "name": "string",
      "slug": "string",
      "description": "string",
      "basePrice": 85000,
      "imageUrl": "string",
      "isActive": true,
      "category": {
        "id": "string",
        "name": "string",
        "slug": "string"
      },
      "skus": [
        {
          "id": "string",
          "productId": "string",
          "color": "Hitam",
          "colorHex": "#000000",
          "size": 40,
          "stock": 10,
          "price": 85000
        }
      ]
    }
  ]
}
```

> **Penting FE:** Endpoint ini mengembalikan data lengkap termasuk `skus`. Cocok untuk di-load di homepage dan difilter di frontend. Di `src/lib/api.ts` ada `productsApi.getAllPublic()` yang memanggil endpoint ini.

---

### `GET /products/{slug}`
Detail produk berdasarkan slug (publik), termasuk SKU dan inventory.

**Auth:** Tidak diperlukan

**Response `200`:**
```json
{
  "id": "string",
  "categoryId": "string",
  "name": "Kaos Polos Hitam",
  "slug": "kaos-polos-hitam",
  "description": "Kaos polos bahan cotton combed 30s",
  "basePrice": 85000,
  "imageUrl": "string",
  "isActive": true,
  "createdAt": "2026-06-03T02:17:57.533Z",
  "updatedAt": "2026-06-03T02:17:57.533Z",
  "category": {
    "id": "string",
    "name": "string",
    "slug": "string"
  },
  "skus": [
    {
      "id": "string",
      "productId": "string",
      "color": "Hitam",
      "colorHex": "#000000",
      "size": 40,
      "stock": 10,
      "price": 90000
    }
  ]
}
```

**Error `404`:** Produk tidak ditemukan atau tidak aktif.

---

### `POST /products` (Admin)
Buat produk baru (type=PRODUCT) atau tambah SKU/varian ke produk yang sudah ada (type=SKU).

**Auth:** Wajib

**Request Body (type=PRODUCT):**
```json
{
  "type": "PRODUCT",
  "categoryId": "clxxxxxxxxxxxxxxxxxxxxxxxxx",
  "name": "Kaos Polos Hitam",
  "slug": "kaos-polos-hitam",
  "description": "Kaos polos bahan cotton combed 30s",
  "basePrice": 85000,
  "imageUrl": "string",
  "isActive": true
}
```

**Request Body (type=SKU):**
```json
{
  "type": "SKU",
  "productId": "clxxxxxxxxxxxxxxxxxxxxxxxxx",
  "color": "Hitam",
  "size": "L",
  "initialStock": 50
}
```

**Response `201`:** Data produk/SKU yang baru dibuat.  
**Error `400`:** Validasi gagal atau slug/SKU duplikat.  
**Error `401/403`:** Token tidak valid / bukan Admin.  
**Error `404`:** Produk tidak ditemukan (untuk type=SKU).

---

### `PATCH /products/{id}` (Admin)
Update data produk.

**Auth:** Wajib

**Request Body:**
```json
{
  "type": "PRODUCT",
  "categoryId": "clxxxxxxxxxxxxxxxxxxxxxxxxx",
  "name": "Kaos Polos Premium",
  "slug": "kaos-polos-premium",
  "description": "Kaos polos premium bahan cotton combed 24s",
  "basePrice": 95000,
  "imageUrl": "string",
  "color": "Putih",
  "size": "XL",
  "stock": 100
}
```

**Response `200`:** Data produk yang telah diupdate.  
**Error `400`:** Validasi gagal atau slug duplikat.  
**Error `401/403/404`:** sesuai standar.

> **Catatan:** Body harus menyertakan field `type: "PRODUCT"` ketika mengupdate produk.

---

### `DELETE /products/{id}` (Admin)
Hapus produk beserta semua SKU dan inventory terkait.

**Auth:** Wajib

**Response `200`:** Produk berhasil dihapus.  
**Error `401/403/404`:** sesuai standar.

---

### `POST /products/{id}/image` (Admin)
Upload gambar produk ke Cloudinary.

**Auth:** Wajib

**Content-Type:** `multipart/form-data`

**Body:**
- `file` (required): File gambar (JPG/PNG)

**Response `200`:** Gambar berhasil diupload.  
**Error `400`:** File tidak ditemukan.  
**Error `401/403/404`:** sesuai standar.

---

### `PATCH /skus/{id}` (Admin)
Update warna dan/atau ukuran SKU.

**Auth:** Wajib

**Request Body:**
```json
{
  "type": "SKU",
  "color": "Putih",
  "size": "XL"
}
```

**Response `200`:** SKU berhasil diupdate.  
**Error `400`:** Validasi gagal atau SKU duplikat / `type` harus "SKU".  
**Error `401/403/404`:** sesuai standar.

> **Penting:** Field `type` **wajib** diisi dengan `"SKU"`. Jika tidak, backend akan error: `type must be SKU`.

---

### `PATCH /inventories/{skuId}` (Admin)
Update stok inventory untuk SKU tertentu.

**Auth:** Wajib

**Request Body:**
```json
{
  "type": "STOCK",
  "stock": 100
}
```

**Response `200`:** Stok berhasil diupdate.  
**Error `400`:** `type` harus "STOCK" dan `stock` wajib diisi.  
**Error `401/403/404`:** sesuai standar.

> **Penting:** Field `type` **wajib** diisi dengan `"STOCK"`. Jika tidak, backend akan error: `type must be STOCK`.

---

## Orders API

### `POST /checkout`
Buat pesanan baru. Stok akan berkurang secara atomik.

**Auth:** Wajib

**Request Body:**
```json
{
  "items": [
    { "skuId": "clxxxxxxxxxxxxxxxxxxxxxxxxx", "quantity": 2 }
  ],
  "shippingType": "DELIVERY",
  "district": "LOWOKWARU",
  "shippingAddress": "Jl. Soekarno-Hatta No. 9, Lowokwaru, Malang",
  "paymentMethod": "MANUAL_TRANSFER"
}
```

**Response `201`:**
```json
{
  "id": "string",
  "userId": "string",
  "status": "PENDING",
  "shippingType": "DELIVERY",
  "district": "LOWOKWARU",
  "shippingAddress": "string",
  "shippingFee": 10000,
  "subtotal": 170000,
  "total": 180000,
  "paymentMethod": "MANUAL_TRANSFER",
  "paymentExpiresAt": "2026-06-03T02:17:57.556Z",
  "createdAt": "2026-06-03T02:17:57.556Z",
  "items": [
    {
      "id": "string",
      "skuId": "string",
      "quantity": 2,
      "price": 85000
    }
  ]
}
```

**Error `400`:** Validasi gagal, stok tidak cukup, atau SKU tidak ditemukan.  
**Error `401`:** Token tidak valid.

> **Catatan:**
> - Jika `shippingType = "DELIVERY"`, wajib mengisi `district` dan `shippingAddress`.
> - Pesanan yang tidak dibayar dalam **1 jam** akan otomatis dibatalkan.
> - Gunakan field `quantity` (bukan `qty`).

---

### `GET /orders`
Daftar pesanan milik user yang sedang login.

**Auth:** Wajib

**Query Params:**
| Param | Type | Deskripsi |
|-------|------|-----------|
| `status` | string | Filter berdasarkan status pesanan |
| `page` | number | Nomor halaman |
| `limit` | number | Jumlah item per halaman |

**Contoh:**
```
GET /orders?status=PENDING&page=1&limit=20
```

**Response `200`:**
```json
{
  "page": 1,
  "limit": 20,
  "total": 3,
  "items": [ /* Order[] */ ]
}
```

**Error `401`:** Token tidak valid.

---

### `GET /orders/{id}`
Detail pesanan milik user yang sedang login.

**Auth:** Wajib

**Response `200`:** Detail pesanan.  
**Error `401`:** Token tidak valid.  
**Error `403`:** Pesanan bukan milik user ini.  
**Error `404`:** Pesanan tidak ditemukan.

---

### `DELETE /orders/{id}`
Hapus pesanan. Bisa diakses oleh Customer dan Admin.

**Auth:** Wajib

**Response `200`:** Pesanan berhasil dihapus.  
**Error `401/403/404`:** sesuai standar.

---

### `POST /orders/{id}/payment-proof`
Upload bukti transfer untuk pesanan yang masih `PENDING`. Setelah upload, status berubah menjadi `WAITING_CONFIRMATION`.

**Auth:** Wajib

**Content-Type:** `multipart/form-data`

**Body:**
- `file` (required): File bukti transfer (JPG/PNG)
- `note` (optional): Catatan, contoh: "Transfer via BCA a/n Budi"

**Response `200`:** Bukti pembayaran berhasil diupload.  
**Error `400`:** Pesanan bukan PENDING atau bukti sudah diupload.  
**Error `401/403/404`:** sesuai standar.

---

### `PATCH /orders/{id}/status` (Admin)
Ubah status pesanan. Transisi yang diizinkan:
- `PENDING` → `CANCELLED`
- `WAITING_CONFIRMATION` → `PAID` / `CANCELLED`
- `PAID` → `SHIPPED`

Jika dibatalkan, stok akan dikembalikan secara otomatis.

**Auth:** Wajib (Admin)

**Request Body:**
```json
{
  "status": "PAID",
  "note": "Transfer via BCA a/n Budi"
}
```

**Response `200`:** Status pesanan berhasil diupdate.  
**Error `400`:** Transisi status tidak valid.  
**Error `401/403/404`:** sesuai standar.

---

## Error Handling

### Format Error Response
```json
{
  "message": "Email atau password salah",
  "error": "Unauthorized",
  "statusCode": 401
}
```

### HTTP Status Codes yang Digunakan
| Code | Deskripsi |
|------|-----------|
| `200` | Berhasil |
| `201` | Berhasil dibuat |
| `400` | Validasi gagal / Bad Request |
| `401` | Token tidak valid atau tidak ada |
| `403` | Tidak memiliki akses (bukan Admin untuk endpoint Admin) |
| `404` | Data tidak ditemukan |
| `500` | Server error |

### Frontend Error Handling Pattern

```typescript
try {
  const response = await productsApi.getAll();
  // handle success
} catch (error) {
  if (error.response?.status === 401) {
    // Token expired/invalid, redirect ke login
    localStorage.removeItem('access_token');
    signOut({ redirect: true, callbackUrl: '/login' });
  } else if (error.response?.status === 404) {
    // Data tidak ditemukan
  } else if (error.response?.status === 400) {
    // Validasi gagal, tampilkan error.message ke user
  } else {
    // Generic error
  }
}
```

> **Catatan:** Axios interceptor di `src/lib/api.ts` sudah menangani `401` secara otomatis dengan `signOut()`.

---

## Frontend Integration Checklist

### 1. Axios Base Setup (`src/lib/api.ts`)
- [x] Base URL dari `NEXT_PUBLIC_API_URL`
- [x] Request interceptor: attach `Bearer <access_token>` dari `localStorage`
- [x] Response interceptor: handle `401` → `signOut()`

### 2. Store (`src/store/shop.ts`)
- [ ] Gunakan `GET /products/all` untuk fetch semua produk (termasuk SKU)
- [ ] Simpan `products`, `categories`, `isLoading`, `error` di Zustand
- [ ] Normalisasi data: pastikan `skus` array ada di setiap product
- [ ] Handle error state dari API

### 3. Homepage (`src/app/page.tsx`)
- [x] Baca `products`, `fetchProducts`, `isLoading` dari store
- [x] Filtering dilakukan di frontend (menggunakan URL query params)
- [x] Gunakan `displayProducts` atau `products` sebagai filter source
- [ ] Pastikan filtering menangani: category, color, size, minPrice, maxPrice, search

### 4. Product Card (`src/components/shop/ProductCard.tsx`)
- [x] Terima props `product: Product` dan `index?: number`
- [ ] Handle kasus `skus` kosong (tampilkan "Habis")
- [ ] Handle imageUrl kosong/gagal load (gunakan placeholder)

### 5. Checkout Flow
- [ ] Pastikan payload `POST /checkout` menggunakan field `quantity` (bukan `qty`)
- [ ] Validasi `shippingType`: jika `DELIVERY`, wajib `district` + `shippingAddress`
- [ ] Simpan `orderId` setelah checkout berhasil
- [ ] Upload payment proof ke `POST /orders/{id}/payment-proof`

### 6. Admin Panel
- [ ] Buat produk: `type: "PRODUCT"` + `categoryId`
- [ ] Tambah SKU: `type: "SKU"` + `productId`
- [ ] Update stok: `type: "STOCK"` + `stock`
- [ ] Update status order: `status: "PAID"` + opsional `note`

---

## Quick Reference: Endpoint → FE Function Mapping

| Backend | FE Function (`src/lib/api.ts`) | Method |
|---------|-------------------------------|--------|
| `POST /auth/register/customer` | `authApi.registerCustomer` | POST |
| `POST /auth/register/admin` | `authApi.registerAdmin` | POST |
| `POST /auth/login` | `authApi.login` | POST |
| `GET /products/all` | `productsApi.getAllPublic` | GET |
| `GET /products` | `productsApi.getAll` | GET |
| `GET /products/{slug}` | `productsApi.getBySlug` | GET |
| `POST /products` | `productsApi.create` | POST |
| `PATCH /products/{id}` | `productsApi.updateProduct` | PATCH |
| `DELETE /products/{id}` | (belum ada) | DELETE |
| `PATCH /skus/{id}` | `productsApi.updateSku` | PATCH |
| `PATCH /inventories/{skuId}` | `productsApi.updateStock` | PATCH |
| `POST /products/{id}/image` | `productsApi.uploadImage` | POST |
| `GET /categories` | (belum ada) | GET |
| `POST /checkout` | `ordersApi.checkout` | POST |
| `GET /orders` | `ordersApi.getMyOrders` | GET |
| `GET /orders/{id}` | `ordersApi.getById` | GET |
| `POST /orders/{id}/payment-proof` | `ordersApi.uploadProof` | POST |
| `PATCH /orders/{id}/status` | `ordersApi.updateStatus` | PATCH |
| `DELETE /orders/{id}` | (belum ada) | DELETE |

---

## Backend Peculiarities & Gotchas

1. **`/products` vs `/products/all` vs `/all`**
   - `GET /products` mengembalikan items **tanpa** array `skus`
   - `GET /products/all` mengembalikan items **dengan** array `skus` lengkap
   - `GET /all` publik, tidak perlu auth
   - Untuk homepage yang butuh SKU untuk filtering, gunakan `/products/all`

2. **Field `type` wajib di mutations**
   - `PATCH /skus/{id}` → body harus ada `"type": "SKU"`
   - `PATCH /inventories/{skuId}` → body harus ada `"type": "STOCK"`
   - `PATCH /products/{id}` → body harus ada `"type": "PRODUCT"`
   - Jika tidak ada `type` yang benar, backend error dengan message yang jelas

3. **Stok di-handle backend**
   - Saat checkout, stok berkurang secara atomic
   - Saat cancel order, stok dikembalikan otomatis
   - FE tidak perlu manual manage stok saat checkout/cancel

4. **Image URL**
   - Backend menyediakan `imageUrl` di response product
   - Upload gambar via `POST /products/{id}/image` → Cloudinary
   - Frontend perlu handle fallback jika `imageUrl` kosong

5. **Price Logic**
   - `basePrice` adalah harga dasar produk
   - `skus[].price` adalah override harga per varian (jika ada)
   - Saat tampilkan harga: pakai `sku.price ?? product.basePrice`
   - Diskon dihitung: `product.discount` (persentase) dari `basePrice`

---

*Generated from swagger-exposed API at `https://sneakerlocal.up.railway.app`*  
*Last updated: 2026-06-03*
