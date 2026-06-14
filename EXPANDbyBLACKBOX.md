# EXPANDbyBLACKBOX.md — Rekomendasi Pengembangan & Improvement

Dokumen ini berisi hal-hal yang **masih kurang / dapat dikembangkan lebih jauh** berdasarkan hasil pembacaan project yang sudah dilakukan.

---

## 1) Konsistensi Auth: NextAuth vs JWT Cookie

### Temuan
- Ada dua jalur autentikasi:
  1. NextAuth (SessionProvider, `signIn('credentials')` di UI)
  2. Cookie JWT custom (`src/server/auth/jwt.ts`) yang dipakai oleh middleware API/helper (`requireAuth/requireAdmin`)
- UI menyimpan `access_token` ke `localStorage`, sementara server auth menggunakan `cookies()` dan `access_token/refresh_token` di HttpOnly cookie.

### Risiko
- Token dobel / sinkronisasi tidak selalu benar (misalnya `localStorage.access_token` vs cookie `access_token`).

### Rekomendasi
- Jadikan **satu sumber kebenaran**:
  - opsi A: gunakan fully NextAuth session untuk semua API (gunakan `getServerSession` NextAuth)
  - opsi B: standardisasi ke custom JWT cookie dan buat UI hanya memicu endpoint login custom (tidak perlu `signIn('credentials')`)
- Tambahkan mekanisme refresh yang konsisten untuk client-side.

---

## 2) Admin UI kemungkinan belum menyertakan endpoint/flow lengkap

### Temuan
- Dokumentasi awal memetakan admin endpoint, namun belum semua admin UI pages/components dibaca dalam detail.

### Rekomendasi
- Pastikan admin UI melakukan:
  - validasi role ADMIN/STAFF
  - error handling konsisten (401/403)
  - form create/update pakai skema yang sama dengan backend

---

## 3) Cart & Persist: Perlu kepastian merge ke server cart

### Temuan
- `src/store/cart.ts` menyediakan `mergeWithServerCart(serverItems)`.
- Tetapi dari flow UI yang dibaca, proses merge ke server cart belum tampak.

### Rekomendasi
- Tambahkan flow:
  - saat login sukses (di UI login/register) → panggil `GET /api/cart` → merge local → update store.
- Pastikan `maxStock` pada cart store di-refresh sebelum checkout.

---

## 4) Price/Discount & Diskon: mismatch antar layer

### Temuan
- UI Product detail menghitung `currentPrice` memakai `product.discount` (yang terlihat dari mock/UI logic).
- Backend schema Prisma tidak menampilkan field `discount` pada `Product`, hanya `basePrice`.

### Risiko
- Perhitungan diskon bisa jadi hanya demo/match mock, bukan data DB.

### Rekomendasi
- Tambahkan field diskon di Prisma jika memang dibutuhkan, atau hilangkan dari UI agar konsisten.

---

## 5) Payment methods: UI hard-code `MANUAL_TRANSFER`

### Temuan
- Checkout UI sudah punya tombol pembayaran (Midtrans/COD disabled), tapi payload mengirim `paymentMethod: 'MANUAL_TRANSFER'`.

### Rekomendasi
- Implementasikan pilihan paymentMethod agar benar-benar terhubung:
  - `MIDTRANS`: buat flow redirect/SDK + webhook update order status.
  - `COD`: logika status & validasi COD.
- Backend sudah punya enum `PaymentMethod` sehingga siap diperluas.

---

## 6) Payment Proof upload: standar input & validasi

### Temuan
- Upload proof & upload umum menerima multipart `file` tanpa validasi tipe ukuran di layer UI/route yang terbaca.

### Rekomendasi
- Tambahkan validasi:
  - `content-type` hanya image/*
  - ukuran file limit (mis 2–5MB)
  - fallback message yang lebih detail
- Dokumentasikan format response upload.

---

## 7) Inventory Movement: RESTOCK/ADJUSTMENT & konsistensi logika

### Temuan
- Inventory movement ada di Prisma: `InventoryMovement(type, quantity, note)`.
- Service `updateOrderStatus` mengembalikan stock untuk `CANCELLED` dengan `type='RETURN'`.
- Service `updateStock` memakai RESTOCK atau ADJUSTMENT.

### Rekomendasi
- Standarisasi definisi `type` di service:
  - apakah `ADJUSTMENT` atau `RESTOCK` harus dipakai pada semua perubahan.
- Audit log stok untuk setiap perubahan (termasuk delete SKU & update inventory via endpoint admin) supaya movements selalu tercatat.

---

## 8) Search: dual filtering (server + client) dan struktur respons

### Temuan
- UI melakukan client-side filter stok dan kategori/warna/size/harga.
- Backend search via `GET /api/products` mendukung q & pagination.

### Rekomendasi
- Tentukan strategi:
  - server-side filtering untuk performa & konsistensi
  - client-side hanya untuk UX sementara
- Rapikan respon endpoint `GET /api/products` dan `GET /api/products/all` supaya struktur seragam.

---

## 9) Error handling: konsistensi response format

### Temuan
- `createHandler` memberikan unified format.
- Beberapa endpoint manual memakai `NextResponse.json` atau `new Response` custom.

### Rekomendasi
- Jadikan semua endpoint konsisten dengan `createHandler` bila memungkinkan.
- Seragamkan error message dan status code.

---

## 10) Security hardening

### Rekomendasi
- Tambahkan rate limiting untuk:
  - login
  - register
  - upload endpoints
- Validasi input tambahan:
  - sanitasi `notes` dan field teks
- Pertimbangkan CSRF protection khususnya untuk endpoint yang memakai cookie.

---

## 11) Performance & Caching

### Temuan
- Homepage dan search sering memanggil API lalu melakukan normalize/filter di client.

### Rekomendasi
- Gunakan React Query untuk caching lebih baik (beberapa pages masih useEffect biasa)
- Tambahkan skeleton/performa untuk loading states (sebagian sudah dilakukan)

---

## 12) DX/Code quality

### Temuan
- Ada TODO di `TODO.md` terkait cleanup store/shop.

### Rekomendasi
- Cleanup unused code & pastikan store yang dipakai hanya yang relevan.
- Tambahkan ESLint rules/CI untuk mendeteksi import unused dan type mismatch.

---

## 13) Database Integrity & Transaction Safety (Enterprise)

### Temuan
- Flow Checkout → Create Order → Reduce Inventory → Create Inventory Movement terjadi lewat beberapa query terpisah.
- Pada repository, sebagian proses sudah dibungkus transaksi, tetapi boundary transaksi lintas langkah bisnis (mis. checkout + clear cart + log) perlu dikonsolidasikan dengan jelas.

### Risiko
- Jika terjadi kegagalan di tengah alur, database berpotensi tidak konsisten (mis. order dibuat tapi inventory movement tidak tercatat, atau cart tidak ter-clear).

### Rekomendasi
- Pastikan boundary transaksi untuk operasi kritikal:
  - Checkout (create order + deduct inventory + create inventory movement)
  - Cancel/Refund (restore inventory + create movement + update status)
  - Payment confirmation (update status + bukti + audit)

---

## 14) Inventory Race Condition (Overselling)

### Temuan
- Validasi stok dilakukan, lalu decrement stok, tetapi implementasi concurrency control harus konsisten untuk mencegah overselling.

### Risiko
- Dua checkout paralel bisa sama-sama lolos validasi stok bila atomic decrement dan pengecekan affected rows tidak tegas.

### Rekomendasi
- Gunakan atomic decrement berbasis kondisi (affected rows) / optimistic concurrency.
- Alternatif:
  - `UPDATE ... SET stock = stock - ? WHERE skuId = ? AND stock >= ?`
  - cek baris terdampak.

---

## 15) SKU Architecture (Kelengkapan Level Enterprise)

### Temuan
- Model saat ini sudah ada `ProductSKU`, tetapi level kebutuhan enterprise (SKU-level image, barcode, dimensions, weight) belum ditampakkan.

### Risiko
- Sulit memperluas marketplace di masa depan (warehouse/label, scanning, ekspedisi).

### Rekomendasi
- Pastikan `ProductSKU` benar-benar menjadi source of truth untuk:
  - harga varian (jika berbeda)
  - media varian (bila berbeda)
  - kode/identitas varian (barcode/skuCode)
  - dimensi/berat (untuk shipping)

---

## 16) Order Snapshot Protection

### Temuan
- OrderItem menyimpan `priceAtPurchase`, tetapi snapshot untuk data lain (mis. nama produk, varian detail, discount) belum terlihat sebagai field immutable terpisah.

### Risiko
- Jika data produk berubah setelah checkout, informasi historis bisa tidak sesuai.

### Rekomendasi
- Tambahkan snapshot immutable pada `OrderItem` (atau tabel snapshot):
  - productName
  - skuCode
  - color/size/text label
  - discount/tax/tarif ongkir bila ada

---

## 17) Tax Engine (Belum Ada)

### Temuan
- Saat ini hanya ada subtotal/shippingFee/totalPrice.

### Rekomendasi
- Pisahkan struktur perhitungan:
  - subtotal
  - discount
  - tax
  - shipping
  - grandTotal

---

## 18) Shipping Engine (Belum Ada Perhitungan Kurir/Service)

### Temuan
- Shipping fee disetel flat via `appSetting` (`shipping_fee`) dan shippingType (DELIVERY/PICKUP).

### Rekomendasi
- Tambahkan engine ongkir per kurir & service:
  - integrasi RajaOngkir/third-party
  - shipping label/tracking status
  - mapping district/courier/service

---

## 19) Refund System (Belum Terlihat)

### Temuan
- Tidak ada model Refund dan alur refund belum ada.

### Rekomendasi
- Tambahkan entitas `Refund` + status workflow:
  - REQUESTED, APPROVED, REJECTED, PROCESSING, COMPLETED
- Tambahkan audit log untuk perubahan status.

---

## 20) Audit Log System Enterprise

### Temuan
- `AuditLog` sudah ada dan digunakan di service untuk operasi admin tertentu.

### Celah
- Tidak semua operasi kritikal (stok via inventory movements tertentu, payment confirmation) terlihat konsisten mencatat metadata lengkap.

### Rekomendasi
- Standardisasi log untuk setiap action:
  - who/when/where
  - oldValue/newValue
  - correlationId (untuk tracing)

---

## 21) RBAC Enterprise (Permission Matrix)

### Temuan
- Role hanya `ADMIN`, `STAFF`, `CUSTOMER`.

### Kekurangan
- Belum ada permission granularity (mis. ORDER_VIEW vs ORDER_UPDATE).

### Rekomendasi
- Tambahkan model permission matrix:
  - Permission
  - RolePermission
- Gunakan guard berdasarkan permission, bukan role saja.

---

## 22) Event Driven Architecture (Domain Events)

### Temuan
- Sistem saat ini sinkron (direct calls) tanpa event bus.

### Risiko
- Integrasi email/analytics/notification sulit diskalakan.

### Rekomendasi
- Tambahkan domain events:
  - OrderCreated, OrderPaid, OrderCancelled, InventoryLow, ProductCreated
- Konsumsi event untuk side effects (email, analytics, notification).

---

## 23) Queue & Background Jobs

### Temuan
- Proses seperti pembuatan receipt, upload, dan integrasi pihak ketiga berjalan langsung.

### Rekomendasi
- Gunakan queue:
  - BullMQ + Redis
- Kandidat job:
  - upload/processing image
  - email/invoice generation
  - search index update

---

## 24) Search Engine (Beyond DB LIKE)

### Temuan
- Search masih berbasis DB filtering (`contains` di ProductRepository).

### Risiko
- Tidak scalable untuk autocomplete/faceted & ranking.

### Rekomendasi
- Integrasi Meilisearch/Elasticsearch:
  - typo tolerance
  - synonym
  - faceted search
  - ranking

---

## 25) Media Service (Upgrade Upload)

### Temuan
- Ada upload product image menggunakan Supabase storage (produk images) dan payment proof/cloudinary.

### Rekomendasi
- Pisahkan media layer enterprise:
  - gunakan S3/R2/MinIO
  - thumbnail generation, compression, WebP
  - CDN caching

---

## 26) Caching Layer (Redis)

### Temuan
- Belum ada cache strategy yang jelas.

### Rekomendasi
- Tambahkan Redis cache untuk:
  - product list
  - categories
  - homepage/hot products
- Terapkan cache invalidation saat update product/category.

---

## 27) Notification Center

### Rekomendasi
- Tambah modul notification:
  - in-app
  - email
  - push/sms
- Simpan state & status di DB untuk audit dan retry.

---

## 28) Analytics & BI

### Rekomendasi
- Tambahkan tracking & dashboard:
  - GMV, Revenue, AOV
  - conversion rate
  - repeat customer
  - cart abandonment

---

## 29) Coupon & Promotion Engine

### Rekomendasi
- Tambahkan engine voucher/coupon:
  - flash sale
  - tier discount
  - bundle/BOGO
  - member discount

---

## 30) Multi-Warehouse Support

### Rekomendasi
- Tambahkan entitas:
  - Warehouse
  - WarehouseInventory
- Inventory depletion per warehouse.

---

## 31) Monitoring & Observability

### Temuan
- Logging/error handling masih berupa `console.error` dan tidak terlihat sistem observability terpusat.

### Rekomendasi
- Tambahkan:
  - Sentry
  - OpenTelemetry
  - Prometheus + Grafana
- Dashboard KPI:
  - checkout failure rate
  - payment failure rate
  - inventory failure rate
  - API latency p95/p99

---

## 32) CI/CD & Deployment

### Temuan
- Strategi CI/CD dan deployment tidak terdokumentasi di repo (minimal belum terlihat pada file yang dibaca).

### Rekomendasi
- Implementasi pipeline:
  - lint, typecheck, unit/integration test, build, migration, smoke test
- Tambahkan strategi deployment:
  - blue/green
  - rollback
  - feature flags

---

## 33) Security Enterprise

### Temuan
- Dokumentasi hanya menyentuh security dasar (validasi input, proteksi role/admin).

### Rekomendasi
- Secrets management:
  - Vault / AWS Secrets Manager
- Security headers:
  - CSP, HSTS, X-Frame-Options
- Account security:
  - rate limiting
  - device session management
  - MFA/2FA
  - suspicious login detection
  - audit trail untuk perubahan password/login

---

## Prioritas Jika Target Production Ready (Enterprise)


1. Auth unification
2. Transaction safety + inventory race condition mitigation
3. Order snapshot immutable fields
4. Payment integration + status workflow
5. Shipping engine per kurir/service
6. Refund & return workflow
7. Audit log standardization
8. RBAC permission matrix
9. Queue & background jobs
10. Media service & image processing pipeline
11. Redis caching layer + invalidation
12. Search engine (Meilisearch/Elastic)
13. Notification center
14. Analytics/BI
15. Multi-warehouse support
16. Observability + CI/CD
17. Security hardening enterprise
18. Event-driven architecture

---

## Penutup
Dokumen ini bertujuan mengubah codebase menjadi lebih “production-ready” dari sisi konsistensi data, keamanan, dan pengalaman pengguna. Bagian tambahan di atas membantu mendekati standar arsitektur enterprise seperti Amazon/Shopify/Tokopedia/ShopeePlus (adaptasi).


