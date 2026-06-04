'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import FilterSidebar from '@/components/shop/FilterSidebar';
import ProductCard from '@/components/shop/ProductCard';
import { mockProducts } from '@/data/mockProducts';
import styles from './page.module.css';

export default function SearchPage() {
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
        const requestParams: Record<string, any> = {};
        if (category) requestParams.category = category;
        if (color) requestParams.color = color;
        if (size) requestParams.size = size;
        if (minPrice) requestParams.minPrice = minPrice;
        if (maxPrice) requestParams.maxPrice = maxPrice;
        if (search) requestParams.search = search;

        const res = await api.get('/products', { params: requestParams });
        const raw = res.data;

        const items = raw?.products ?? raw?.items ?? raw?.itemsList ?? (Array.isArray(raw) ? raw : []) ?? [];
        const serverCategories: string[] = Array.isArray(raw?.categories) ? raw.categories : [];

        const normalized = (items as any[]).map((product: any) => ({
          ...product,
          images: product.imageUrl ? [product.imageUrl] : product.images || ['/placeholder-shoes.png'],
          category: product.category?.name || product.category || 'Uncategorized',
          _mock: false,
        }));

        const categoriesNormalized =
          serverCategories.length
            ? serverCategories.map((c: any) => c?.name ?? c?.slug).filter(Boolean)
            : Array.from(new Set(normalized.map((p: any) => p.category).filter(Boolean)));

        const uniqueCategories = Array.from(new Set(categoriesNormalized));

        if (!mounted) return;
        setProducts(normalized);
        setCategories(uniqueCategories as string[]);
        setIsLoading(false);
      } catch (err: any) {
        if (!mounted) return;

        const mockWithFilter = mockProducts.map((p) => ({
          ...p,
          images: p.imageUrl ? [p.imageUrl] : p.images || ['/placeholder-shoes.png'],
          category: p.category?.name || p.category || 'Uncategorized',
          _mock: true,
        }));

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
          if (size && !availableSkus.some((sku: any) => sku.size === size)) return false;
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
      if (size && !availableSkus.some((sku: any) => sku.size === size)) return false;
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
