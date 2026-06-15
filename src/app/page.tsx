'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { productsApi } from '@/lib/api';
import { parseProductsList } from '@/lib/api-helpers';
import FilterSidebar from '@/components/shop/FilterSidebar';
import ProductCard from '@/components/shop/ProductCard';
import type { Product } from '@/types';
import styles from './page.module.css';

function HomeContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filterColors, setFilterColors] = useState<{ name: string; hex: string }[]>([]);
  const [filterSizes, setFilterSizes] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useSearchParams();
  const category = params.get('category') ?? '';
  const color = params.get('color') ?? '';
  const size = Number(params.get('size') ?? '0');
  const minPrice = Number(params.get('minPrice') ?? '0');
  const maxPrice = Number(params.get('maxPrice') ?? '0');
  // Support both ?q= (from Navbar search) and ?search= (from filter sidebar)
  const search = (params.get('q') ?? params.get('search') ?? '').toLowerCase();

  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await productsApi.listCatalog();
        const normalizedProducts = parseProductsList(response.data);

        const uniqueCategories = Array.from(
          new Set(normalizedProducts.map((p) => {
            const cat = p.category;
            return typeof cat === 'string' ? cat : null;
          }).filter(Boolean))
        ) as string[];

        // Extract unique colors and sizes from all SKUs for dynamic filter
        const colorMap = new Map<string, string>();
        const sizeSet = new Set<number>();
        normalizedProducts.forEach((p) => {
          (p.skus || []).forEach((sku) => {
            if (sku.color) colorMap.set(sku.color, sku.colorHex || '#888888');
            if (sku.sizeEU) sizeSet.add(sku.sizeEU);
          });
        });
        const uniqueColors = Array.from(colorMap.entries()).map(([name, hex]) => ({ name, hex }));
        const uniqueSizes = Array.from(sizeSet).sort((a, b) => a - b);

        if (!mounted) return;
        setProducts(normalizedProducts);
        setCategories(uniqueCategories);
        setFilterColors(uniqueColors);
        setFilterSizes(uniqueSizes);
        setIsLoading(false);
      } catch (err: unknown) {
        if (!mounted) return;
        setError('Gagal memuat produk. Coba refresh halaman.');
        setProducts([]);
        setIsLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const displayProducts = useMemo(() => {
    return products.filter((product) => {
      const availableSkus = (product.skus || []).filter((sku) => sku.stock > 0);
      if (!availableSkus.length) return false;

      // Category filter: case-insensitive
      if (category) {
        const productCategory = String(product.category ?? '');
        if (productCategory.toLowerCase() !== category.toLowerCase()) return false;
      }

      // Search filter
      if (search) {
        const name = String(product.name ?? '').toLowerCase();
        const desc = String(product.description ?? '').toLowerCase();
        if (![name, desc].some((field) => field.includes(search))) return false;
      }

      // Color filter: exact match against SKU color value from server
      if (color && !availableSkus.some((sku) => sku.color === color)) return false;

      // Size filter: exact match against EU size
      if (size && !availableSkus.some((sku) => Number(sku.sizeEU) === size)) return false;

      // Price filter
      if (minPrice && !availableSkus.some((sku) => (sku.price ?? product.basePrice) >= minPrice)) return false;
      if (maxPrice && maxPrice > 0 && !availableSkus.some((sku) => (sku.price ?? product.basePrice) <= maxPrice)) return false;

      return true;
    });
  }, [products, category, color, size, minPrice, maxPrice, search]);

  return (
    <div className={styles.heroPage}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.heroBadge}>SneakerLocal</span>
          <h1 className={styles.heroTitle}>Sepatu lokal Malang, varian warna dan ukuran lengkap.</h1>
          <p className={styles.heroText}>
            Jelajahi katalog sepatu untuk mahasiswa: sneakers, kasual, formal, dan sandal dengan filter harga, ukuran, warna, dan stok tersedia.
          </p>
          <div className={styles.heroActions}>
            <Link href="/cart" className="btn btn-primary btn-lg">
              Buka Keranjang
            </Link>
            <Link href="/search" className="btn btn-secondary btn-lg">
              Lihat Katalog
            </Link>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.heroCard}>
            <h2>Flat ongkir Malang Raya</h2>
            <p>Rp10.000 untuk Lowokwaru, Klojen, Blimbing, Sukun, Kedungkandang.</p>
          </div>
        </div>
      </section>

      <section className="container">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionLabel}>Katalog Produk</p>
            <h2 className={styles.sectionTitle}>Temukan sepatu sesuai kantong mahasiswa</h2>
          </div>
          <p className={styles.sectionMeta}>
            {isLoading
              ? 'Memuat...'
              : `Menampilkan ${displayProducts.length} produk dengan stok tersedia.`}
          </p>
        </div>

        {error && (
          <div className="card" style={{ padding: '12px 16px', marginBottom: '20px' }}>
            <p className="form-error" style={{ margin: 0 }}>{error}</p>
          </div>
        )}

        <div className={styles.shopGrid}>
          <div className={styles.sidebarWrapper}>
            <FilterSidebar categories={categories} colors={filterColors} sizes={filterSizes} />
          </div>
          <div className={styles.productGrid}>
            {displayProducts.length === 0 ? (
              <div className={styles.emptyState}>
                <p className="text-muted">Tidak ada produk sesuai filter. Coba ubah kategori, warna, atau ukuran.</p>
              </div>
            ) : (
              displayProducts.map((product: any, index: number) => (
                <ProductCard key={product.id ?? product.slug ?? index} product={product} index={index} />
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: '40px 0' }}><p className="text-muted">Memuat...</p></div>}>
      <HomeContent />
    </Suspense>
  );
}
