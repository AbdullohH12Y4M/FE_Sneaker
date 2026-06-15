'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { productsApi } from '@/lib/api';
import { parseProductsList } from '@/lib/api-helpers';
import FilterSidebar from '@/components/shop/FilterSidebar';
import ProductCard from '@/components/shop/ProductCard';
import type { Product } from '@/types';
import styles from './page.module.css';

function SearchContent() {
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
  // Support ?q= (from Navbar) and ?search= (from filter sidebar, backward compat)
  const search = (params.get('q') ?? params.get('search') ?? '').toLowerCase();

  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await productsApi.getAllPublic();
        const normalized = parseProductsList(res.data);

        const uniqueCategories = Array.from(
          new Set(normalized.map((p) => {
            const cat = p.category;
            return typeof cat === 'string' ? cat : null;
          }).filter(Boolean))
        ) as string[];

        // Extract unique colors and sizes from all SKUs for dynamic filter
        const colorMap = new Map<string, string>();
        const sizeSet = new Set<number>();
        normalized.forEach((p) => {
          (p.skus || []).forEach((sku) => {
            if (sku.color) colorMap.set(sku.color, sku.colorHex || '#888888');
            if (sku.sizeEU) sizeSet.add(sku.sizeEU);
          });
        });
        const uniqueColors = Array.from(colorMap.entries()).map(([name, hex]) => ({ name, hex }));
        const uniqueSizes = Array.from(sizeSet).sort((a, b) => a - b);

        if (!mounted) return;
        setProducts(normalized);
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
  }, [category, color, size, minPrice, maxPrice, search]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const availableSkus = (product.skus || []).filter((sku) => sku.stock > 0);
      if (!availableSkus.length) return false;

      if (category) {
        const productCategory = String(product.category ?? '');
        if (productCategory.toLowerCase() !== category.toLowerCase()) return false;
      }

      if (search) {
        const name = String(product.name ?? '').toLowerCase();
        const desc = String(product.description ?? '').toLowerCase();
        if (![name, desc].some((field) => field.includes(search))) return false;
      }

      if (color && !availableSkus.some((sku) => sku.color === color)) return false;
      if (size && !availableSkus.some((sku) => Number(sku.sizeEU) === size)) return false;
      if (minPrice && !availableSkus.some((sku) => (sku.price ?? product.basePrice) >= minPrice)) return false;
      if (maxPrice && maxPrice > 0 && !availableSkus.some((sku) => (sku.price ?? product.basePrice) <= maxPrice)) return false;

      return true;
    });
  }, [products, category, color, size, minPrice, maxPrice, search]);

  return (
    <div className={styles.heroPage}>
      <section className="container" style={{ paddingTop: 24 }}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionLabel}>Katalog Produk</p>
            <h2 className={styles.sectionTitle}>Temukan sepatu sesuai kantong mahasiswa</h2>
          </div>
          <p className={styles.sectionMeta}>
            {isLoading ? 'Memuat...' : `Menampilkan ${filteredProducts.length} produk`}
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
            {filteredProducts.length === 0 ? (
              <div className={styles.emptyState}>
                <p className="text-muted">Tidak ada produk sesuai filter. Coba ubah kategori, warna, atau ukuran.</p>
              </div>
            ) : (
              filteredProducts.map((product: any, index: number) => (
                <ProductCard key={product.id ?? product.slug ?? index} product={product} index={index} />
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="container" style={{ padding: '40px 0' }}>
        <p className="text-muted">Memuat katalog...</p>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
