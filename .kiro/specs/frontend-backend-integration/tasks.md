# Implementation Plan: Frontend-Backend Integration

## Overview

Implementasi ini memperbaiki lima titik koneksi frontend-backend pada proyek SneakerLocal menggunakan TypeScript/React. Setiap task membangun di atas task sebelumnya, dimulai dari lapisan paling dasar (API helpers) lalu naik ke komponen UI.

---

## Tasks

- [ ] 1. Tambah `adminApi` ke `src/lib/api.ts`
  - Tambahkan export `adminApi` dengan method `getDashboard()` yang memanggil `GET /api/admin/dashboard`
  - Sertakan fallback mock yang mengembalikan struktur `{ stats: {}, recentOrders: [], recentLogs: [] }` saat `isMockApiEnabled()` aktif
  - _Persyaratan: 4.4_

- [ ] 2. Perbaiki Navbar — normalisasi pencarian dan navigasi ke Search page
  - [ ] 2.1 Perbaiki pembacaan respons pencarian di `Navbar.tsx`
    - Ubah baris pembacaan hasil dari `res.data?.products ?? res.data?.items ?? ...` menjadi `res.data?.data?.items ?? []`
    - Pastikan variabel `list` selalu berupa array meski respons tidak terduga
    - _Persyaratan: 1.1, 1.2_

  - [ ]* 2.2 Tulis property test untuk normalisasi pencarian Navbar
    - **Properti 2: Pencarian Navbar Selalu Membaca dari Wrapper yang Benar**
    - **Memvalidasi: Persyaratan 1.1, 1.2**
    - Generate berbagai bentuk objek respons (`{ data: { items } }`, `{ items }`, `{}`, `null`) dan pastikan hasilnya selalu array

  - [ ] 2.3 Tambah navigasi ke Search page saat Enter dan tombol "Lihat semua"
    - Import `useRouter` dari `next/navigation` di `Navbar.tsx`
    - Tambahkan handler `onKeyDown` pada `<input>` pencarian: jika `key === 'Enter'` dan query tidak kosong, panggil `router.push('/search?q=' + encodeURIComponent(query))`
    - Tambahkan tautan "Lihat semua hasil untuk '{query}'" di bagian bawah dropdown hasil pencarian, mengarah ke `/search?q={encodeURIComponent(searchQuery)}`
    - _Persyaratan: 1.3, 1.4_

- [ ] 3. Perbaiki Navbar — kategori dinamis dari API
  - [ ] 3.1 Ganti `NAV_LINKS` hardcoded dengan fetch ke `/api/categories`
    - Hapus atau pisahkan konstanta `NAV_LINKS` — pertahankan hanya link "Beranda" sebagai statis
    - Tambahkan state `categories: NavCategory[]` dan `categoriesLoading: boolean`
    - Pada `useEffect` saat mount, panggil `categoriesApi.getAll()` dan baca hasilnya dari `res.data?.data ?? []`
    - Normalisasi tiap kategori menjadi `{ id, name, slug }` dan buat href `/?category=${slug.toUpperCase()}`
    - Render link kategori dinamis di desktop nav dan mobile menu
    - _Persyaratan: 2.1, 2.2, 2.4_

  - [ ]* 3.2 Tulis property test untuk rendering kategori dinamis
    - **Properti 3: Kategori Navbar Mencerminkan Data dari Database**
    - **Memvalidasi: Persyaratan 2.1, 2.2**
    - Generate array kategori acak dan verifikasi bahwa jumlah link yang dirender sesuai jumlah kategori yang valid

  - [ ] 3.3 Tangani error kategori dengan graceful degradation
    - Bungkus fetch kategori dalam try-catch
    - Jika gagal, set `categories` ke array kosong dan `categoriesLoading` ke false — tidak tampilkan error ke pengguna
    - _Persyaratan: 2.3_

- [ ] 4. Checkpoint — Verifikasi Navbar
  - Pastikan semua tests terkait Navbar lulus, tanyakan kepada pengguna jika ada pertanyaan.

- [ ] 5. Hapus fallback mock pada Home Page
  - [ ] 5.1 Ganti blok `catch` yang menyetel data mock dengan error state murni
    - Hapus import `mockProducts` dari `src/app/page.tsx`
    - Hapus semua penggunaan `setIsFromMock(true)` dan `setProducts(mockWithFilter)` di dalam blok `catch`
    - Ganti dengan `setError('Gagal memuat produk. Silakan coba lagi.')` dan `setProducts([])`
    - Hapus state `isFromMock` dan semua conditional rendering yang merujuknya
    - _Persyaratan: 3.1, 3.2, 3.3_

  - [ ]* 5.2 Tulis unit test untuk behavior error state Home Page
    - Mock `productsApi.listCatalog` agar throw error
    - Verifikasi bahwa `products` state menjadi `[]` dan `error` state terisi pesan yang sesuai
    - Verifikasi bahwa tidak ada produk yang dirender saat error
    - _Persyaratan: 3.2_

- [ ] 6. Hapus fallback mock pada Search Page
  - [ ] 6.1 Ganti blok `catch` Search Page dengan error state murni
    - Hapus import `mockProducts` dari `src/app/search/page.tsx`
    - Hapus semua penggunaan data mock di dalam blok `catch`
    - Ganti dengan `setError('Gagal memuat produk. Silakan coba lagi.')` dan `setProducts([])`
    - Hapus state `isFromMock` dan semua conditional rendering yang merujuknya
    - _Persyaratan: 3.4, 3.5, 3.6_

  - [ ] 6.2 Sinkronkan pembacaan parameter URL `?q=` di Search Page
    - Ubah `params.get('search')` menjadi `params.get('q') ?? params.get('search') ?? ''` untuk mendukung keduanya
    - Pastikan nilai `search` diteruskan ke `productsApi.getAll()` sebagai `requestParams.q`
    - _Persyaratan: 5.1, 5.2, 5.3_

  - [ ]* 6.3 Tulis property test untuk sinkronisasi URL parameter
    - **Properti 4: URL Search Parameter Sinkron Antar Komponen**
    - **Memvalidasi: Persyaratan 5.1, 5.4**
    - Generate string query acak dan verifikasi bahwa nilai yang masuk ke API sama dengan yang ada di URL

- [ ] 7. Checkpoint — Verifikasi Home Page dan Search Page
  - Pastikan semua tests terkait halaman Home dan Search lulus, tanyakan kepada pengguna jika ada pertanyaan.

- [ ] 8. Perbaiki Admin Dashboard — integrasi endpoint stats
  - [ ] 8.1 Refactor `src/app/admin/page.tsx` untuk menggunakan `adminApi.getDashboard()`
    - Import `adminApi` dari `@/lib/api`
    - Tambahkan interface `DashboardStats` dengan field: `totalOrders`, `totalUsers`, `totalActiveProducts`, `totalRevenue`, `pendingConfirmationCount`
    - Tambahkan state `stats: DashboardStats` dengan nilai default semua 0
    - Pada `fetchOrders` (atau buat `fetchDashboard` baru), panggil `adminApi.getDashboard()` dan baca `res.data?.data`
    - Set `stats` dari `dashData?.stats` dan `orders` dari `parseOrdersList(dashData?.recentOrders ?? [])`
    - _Persyaratan: 4.1, 4.2_

  - [ ] 8.2 Perbarui stats card untuk menampilkan data dari endpoint
    - Ganti kalkulasi manual `orders.length` dan `orders.filter(...)` dengan nilai dari `stats`
    - Tampilkan stats card untuk: Total Pesanan, Menunggu Verifikasi, Total Pengguna, Produk Aktif, Total Pendapatan
    - _Persyaratan: 4.2_

  - [ ] 8.3 Tangani error dashboard dengan nilai default
    - Jika `adminApi.getDashboard()` gagal, set `stats` ke semua nilai 0
    - Tampilkan pesan error di bawah stats card
    - _Persyaratan: 4.3_

  - [ ]* 8.4 Tulis property test untuk stats Admin Dashboard
    - **Properti 5: Admin Stats Berasal dari Endpoint Dashboard**
    - **Memvalidasi: Persyaratan 4.1, 4.2**
    - Generate objek stats acak dan verifikasi bahwa nilai yang ditampilkan di UI sesuai dengan nilai dari API response

- [ ] 9. Tulis property test untuk normalisasi parseProductsList
  - [ ]* 9.1 Tulis property test untuk `parseProductsList` dengan berbagai bentuk respons
    - **Properti 1: Normalisasi Respons API Berjenis Konsisten**
    - **Memvalidasi: Persyaratan 1.2, 3.1**
    - Generate berbagai bentuk objek respons: `{ data: { items: [...] } }` (wrapped), `{ items: [...] }` (raw), `[...]` (array langsung), `{}` (kosong), `null`
    - Verifikasi bahwa `parseProductsList` selalu mengembalikan array dan tidak pernah throw

- [ ] 10. Checkpoint Akhir — Pastikan semua tests lulus
  - Pastikan semua unit test dan property test lulus, tanyakan kepada pengguna jika ada pertanyaan.

---

## Task Dependency Graph

```
1 (adminApi) → 8 (Admin Dashboard)
2.1 (Navbar search fix) → 2.3 (Navbar search nav) → 4 (Checkpoint Navbar)
3.1 (Navbar categories) → 3.3 (graceful degradation) → 4 (Checkpoint Navbar)
4 (Checkpoint Navbar) → 5.1 (Home mock removal) → 7 (Checkpoint Home/Search)
4 (Checkpoint Navbar) → 6.1 (Search mock removal) → 6.2 (URL sync) → 7 (Checkpoint Home/Search)
7 (Checkpoint Home/Search) → 8.1 (Admin stats) → 8.2 → 8.3 → 9.1 (PBT) → 10 (Final Checkpoint)
```

## Notes

- Tasks bertanda `*` adalah opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task mereferensikan persyaratan spesifik untuk keterlacakan
- Property tests memvalidasi properti kebenaran universal dari desain
- TypeScript digunakan sebagai bahasa implementasi di seluruh task
- Library PBT yang digunakan: `fast-check` (install jika belum ada: `npm install --save-dev fast-check`)
