'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { productsApi } from '@/lib/api';
import { parseProductsList } from '@/lib/api-helpers';
import FilterSidebar from '@/components/shop/FilterSidebar';
import ProductCard from '@/components/shop/ProductCard';
import { mockProducts } from '@/data/mockProducts';
import styles from './page.module.css';

function SearchContent() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromMock, setIsFromMock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = useSearchParams();
  const category = params.get('category') ?? '';
  const color = params.get('color') ?? '';
  const size = Number(params.get('size') ?? '0');
  const minPrice = Number(params.get('minPrice') ?? '0');
  const maxPrice = Number(params.get('maxPrice') ?? '0');
  const search = params.get('search')?.toLowerCase() ?? '';

  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      setIsFromMock(false);

      try {
        // getAllPublic hits /api/products/all which returns full data with SKUs
        // This is required for client-side filtering by color/size/stock
        const res = await productsApi.getAllPublic();
        const raw = res.data;

        const normalized = parseProductsList(raw).map((p) => ({ ...p, _mock: false }));

        const uniqueCategories = Array.from(
          new Set(normalized.map((p) => {
            const cat = p.category;
            return typeof cat === 'string' ? cat : (cat as any)?.name ?? null;
          }).filter(Boolean))
        ) as string[];

        if (!mounted) return;
        setProducts(normalized);
        setCategories(uniqueCategories as string[]);
        setIsLoading(false);
      } catch (err: any) {
        if (!mounted) return;

        const mockWithFilter = mockProducts.map((p) => ({
          ...p,
          images: p.images && p.images.length > 0 ? p.images : ['/placeholder-shoes.png'],
          category: (typeof p.category === 'string' ? p.category : (p.category as any)?.name ?? (p.category as any)?.slug) || 'Uncategorized',
          _mock: true,
        }));
// 
        const filteredMock = mockWithFilter.filter((product: any) => {
          const availableSkus = (product.skus || []).filter((sku: any) => sku.stock > 0);
          if (!availableSkus.length) return false;

          if (category && product.category !== category) return false;
          if (search) {
            const name = String(product.name ?? '').toLowerCase();
            const desc = String(product.description ?? '').toLowerCase();
            if (![name, desc].some((field) => field.toLowerCase().includes(search))) return false;
          }
if (color && !availableSkus.some((sku: any) => String(sku.color ?? '').toLowerCase() === color.toLowerCase())) return false;
           if (size && !availableSkus.some((sku: any) => sku.sizeEU === size)) return false;
          if (minPrice && !availableSkus.some((sku: any) => (sku.price ?? product.basePrice) >= minPrice)) return false;
          if (maxPrice && maxPrice > 0 && !availableSkus.some((sku: any) => (sku.price ?? product.basePrice) <= maxPrice)) return false;

          return true;
        });

        setProducts(filteredMock);
        setCategories(Array.from(new Set(mockWithFilter.map((p: any) => p.category).filter(Boolean))) as string[]);
        setIsFromMock(true);
        setError('Menampilkan data demo (backend belum terhubung)');
        setIsLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [category, color, size, minPrice, maxPrice, search]);

  const filteredProducts = useMemo(() => {
    if (isFromMock) return products;
    return products.filter((product: any) => {
      const availableSkus = (product.skus || []).filter((sku: any) => sku.stock > 0);
      if (!availableSkus.length) return false;

      if (category && product.category !== category) return false;

      if (search) {
        const name = String(product.name ?? '').toLowerCase();
        const desc = String(product.description ?? '').toLowerCase();
        if (![name, desc].some((field) => field.toLowerCase().includes(search))) return false;
      }

if (color && !availableSkus.some((sku: any) => String(sku.color ?? '').toLowerCase() === color.toLowerCase())) return false;
           if (size && !availableSkus.some((sku: any) => sku.sizeEU === size)) return false;
      if (minPrice && !availableSkus.some((sku: any) => (sku.price ?? product.basePrice) >= minPrice)) return false;
      if (maxPrice && maxPrice > 0 && !availableSkus.some((sku: any) => (sku.price ?? product.basePrice) <= maxPrice)) return false;

      return true;
    });
  }, [products, category, color, size, minPrice, maxPrice, search, isFromMock]);

  return (
    <div className={styles.heroPage}>
      <section className="container" style={{ paddingTop: 24 }}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionLabel}>Katalog Produk</p>
            <h2 className={styles.sectionTitle}>
              {isFromMock ? 'Data Demo' : 'Temukan sepatu sesuai kantong mahasiswa'}
            </h2>
          </div>
          <p className={styles.sectionMeta}>
            {isLoading ? 'Memuat...' : `Menampilkan ${filteredProducts.length} produk`}
          </p>
        </div>

        {isFromMock && (
          <div className="card" style={{ padding: '12px 16px', marginBottom: '20px', borderLeft: '4px solid var(--color-warning)' }}>
            <p className="text-muted" style={{ margin: 0 }}>
              ⚠️ <strong>Mode Demo:</strong> Menampilkan data produk contoh karena backend belum terhubung. Setelah backend aktif, data akan otomatis terbarui.
            </p>
          </div>
        )}

        {error && !isFromMock && (
          <div className="card" style={{ padding: '12px 16px', marginBottom: '20px' }}>
            <p className="form-error" style={{ margin: 0 }}>{error}</p>
          </div>
        )}

        <div className={styles.shopGrid}>
          <div className={styles.sidebarWrapper}>
            <FilterSidebar categories={categories} />
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
