# Requirements Document

## Introduction

Dokumen ini mendefinisikan persyaratan fungsional untuk memperbaiki semua titik koneksi antara frontend (React/Next.js) dan backend (API Routes + Prisma + Supabase) pada proyek SneakerLocal. Lima area utama yang diperbaiki: normalisasi respons pencarian Navbar, kategori Navbar dinamis, penghapusan fallback mock pada halaman Home dan Search, integrasi endpoint statistik Admin Dashboard, dan sinkronisasi parameter URL pencarian.

---

## Glossary

- **Navbar**: Komponen navigasi utama (`src/components/layout/Navbar.tsx`)
- **Home_Page**: Halaman beranda (`src/app/page.tsx`)
- **Search_Page**: Halaman katalog/pencarian (`src/app/search/page.tsx`)
- **Admin_Dashboard**: Halaman dashboard admin (`src/app/admin/page.tsx`)
- **Products_API**: Helper fungsi `productsApi` di `src/lib/api.ts`
- **Categories_API**: Helper fungsi `categoriesApi` di `src/lib/api.ts`
- **Admin_API**: Helper fungsi `adminApi` di `src/lib/api.ts` (baru)
- **API_Helpers**: Modul `src/lib/api-helpers.ts` berisi fungsi normalisasi
- **Wrapped_Response**: Format respons `{ success: true, data: {...} }` dari route yang menggunakan `createHandler`
- **Raw_Response**: Format respons langsung seperti `{ items: [...] }` dari `/api/products/all`
- **Mock_Data**: Data statis dari `src/data/mockProducts.ts` yang digunakan sebagai fallback sementara

---

## Requirements

### Requirement 1: Perbaikan Pencarian Navbar

**User Story:** Sebagai pengguna, saya ingin fungsi pencarian di Navbar benar-benar menampilkan produk yang relevan dari database, sehingga saya dapat menemukan sepatu yang saya cari dengan cepat.

#### Acceptance Criteria

1. WHEN pengguna mengetik query di kolom pencarian Navbar, THE Navbar SHALL memanggil `productsApi.getAll({ q: query, limit: 5 })` dan membaca hasil dari `res.data.data.items` (bukan `res.data.items` atau `res.data.products`).
2. IF respons dari `/api/products` tidak mengandung field `data.items`, THEN THE Navbar SHALL menampilkan array kosong sebagai hasil pencarian dan tidak melempar exception.
3. WHEN pengguna menekan tombol Enter pada kolom pencarian yang berisi query, THE Navbar SHALL melakukan navigasi ke `/search?q={query}` menggunakan `router.push`.
4. WHEN dropdown pencarian terbuka dan hasil tersedia, THE Navbar SHALL menampilkan tautan "Lihat semua hasil untuk '{query}'" yang mengarah ke `/search?q={query}`.
5. WHILE pencarian sedang berlangsung (loading), THE Navbar SHALL menampilkan teks "Mencari..." pada dropdown.

---

### Requirement 2: Kategori Navbar Dinamis

**User Story:** Sebagai pengguna, saya ingin link kategori di Navbar mencerminkan kategori yang benar-benar ada di database, sehingga navigasi selalu up-to-date dengan data terkini.

#### Acceptance Criteria

1. WHEN Navbar selesai di-mount, THE Navbar SHALL memanggil `categoriesApi.getAll()` dan membaca daftar kategori dari `res.data.data` (array dari Wrapped_Response).
2. THE Navbar SHALL merender link kategori secara dinamis berdasarkan data yang dikembalikan dari `/api/categories`, menggantikan konstanta `NAV_LINKS` yang dikodekan keras untuk link kategori.
3. IF pemanggilan `/api/categories` gagal, THEN THE Navbar SHALL tetap merender tanpa link kategori (graceful degradation) dan tidak menampilkan pesan error kepada pengguna.
4. WHERE kategori tersedia dari API, THE Navbar SHALL membuat link kategori dengan format `/?category={slug.toUpperCase()}` agar konsisten dengan logika filter yang sudah ada di Home_Page.

---

### Requirement 3: Penghapusan Fallback Mock pada Halaman Home dan Search

**User Story:** Sebagai developer, saya ingin halaman Home dan Search terhubung penuh ke backend nyata tanpa fallback ke data mock, sehingga pengguna selalu melihat data produk yang akurat dari database.

#### Acceptance Criteria

1. WHEN pemanggilan `productsApi.listCatalog()` berhasil, THE Home_Page SHALL merender produk dari data nyata dan tidak menggunakan `mockProducts` sama sekali.
2. IF pemanggilan `productsApi.listCatalog()` gagal, THEN THE Home_Page SHALL menampilkan pesan error yang informatif (mis. "Gagal memuat produk. Silakan coba lagi.") dan merender daftar produk kosong — bukan data mock.
3. THE Home_Page SHALL tidak menyertakan referensi import ke `mockProducts` setelah perbaikan.
4. WHEN pemanggilan `productsApi.getAll()` berhasil di Search_Page, THE Search_Page SHALL merender produk dari data nyata dan tidak menggunakan `mockProducts` sama sekali.
5. IF pemanggilan `productsApi.getAll()` gagal di Search_Page, THEN THE Search_Page SHALL menampilkan pesan error yang informatif dan merender daftar produk kosong — bukan data mock.
6. THE Search_Page SHALL tidak menyertakan referensi import ke `mockProducts` setelah perbaikan.

---

### Requirement 4: Integrasi Endpoint Statistik Admin Dashboard

**User Story:** Sebagai admin, saya ingin Dashboard Admin menampilkan statistik lengkap dari endpoint khusus, sehingga saya mendapatkan gambaran bisnis yang akurat tanpa perlu menghitung secara manual dari daftar pesanan.

#### Acceptance Criteria

1. WHEN Admin_Dashboard selesai di-mount dan sesi admin valid, THE Admin_Dashboard SHALL memanggil `adminApi.getDashboard()` dan membaca data dari `res.data.data` (Wrapped_Response dari `/api/admin/dashboard`).
2. THE Admin_Dashboard SHALL menampilkan stats card dengan nilai dari `stats.totalOrders`, `stats.totalUsers`, `stats.totalActiveProducts`, `stats.totalRevenue`, dan `stats.pendingConfirmationCount`.
3. IF pemanggilan `adminApi.getDashboard()` gagal, THEN THE Admin_Dashboard SHALL menampilkan nilai default 0 pada semua stats card dan menampilkan pesan error.
4. THE Admin_API SHALL menambahkan method `getDashboard()` yang memanggil `GET /api/admin/dashboard` di `src/lib/api.ts`.
5. THE Admin_Dashboard SHALL tetap mempertahankan fungsionalitas filter status pesanan dan tombol export CSV/JSON yang sudah ada.

---

### Requirement 5: Sinkronisasi Parameter URL Pencarian

**User Story:** Sebagai pengguna, saya ingin saat saya mencari dari Navbar dan diarahkan ke halaman Search, filter pencarian teks sudah terisi sesuai query saya, sehingga pengalaman pencarian terasa mulus dan konsisten.

#### Acceptance Criteria

1. WHEN Search_Page diakses dengan URL parameter `?q={query}`, THE Search_Page SHALL membaca nilai parameter `q` dan menggunakannya sebagai query pencarian teks.
2. THE Search_Page SHALL juga mendukung parameter `?search={query}` sebagai fallback untuk kompatibilitas mundur dengan link lama.
3. WHEN Search_Page memiliki nilai query teks, THE Search_Page SHALL meneruskan nilai tersebut ke `productsApi.getAll()` sebagai parameter `q`.
4. WHEN pengguna memasukkan query di kolom pencarian Navbar dan menekan Enter, THE Navbar SHALL melakukan redirect ke `/search?q={encodedQuery}` sehingga Search_Page dapat membacanya sesuai kriteria 5.1.
