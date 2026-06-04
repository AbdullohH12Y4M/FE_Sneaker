'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import FilterSidebar from '@/components/shop/FilterSidebar';
import ProductCard from '@/components/shop/ProductCard';
import { mockProducts } from '@/data/mockProducts';
import styles from './page.module.css';

export default function HomePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromMock, setIsFromMock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      setIsFromMock(false);

      try {
        const response = await api.get('/products', { params: { limit: 20 } });
        const productsFromApi = response.data?.products ?? response.data?.items ?? response.data?.itemsList ?? response.data ?? [];
        const categoriesFromApi = response.data?.categories ?? [];

        const normalizedProducts = (productsFromApi as any[]).map((product: any) => ({
          ...product,
          images: product.imageUrl ? [product.imageUrl] : product.images || ['/placeholder-shoes.png'],
          category: product.category?.name || product.category || 'Uncategorized',
          _mock: false,
        }));

        const categoriesNormalized =
          Array.isArray(categoriesFromApi) && categoriesFromApi.length
            ? (categoriesFromApi.map((c: any) => c?.name ?? c?.slug).filter(Boolean) as string[])
            : (Array.from(new Set(normalizedProducts.map((p: any) => p.category).filter(Boolean))) as string[]);

        const uniqueCategories = Array.from(new Set(categoriesNormalized)) as string[];

        if (!mounted) return;
        setProducts(normalizedProducts);
        setCategories(uniqueCategories);
        setIsLoading(false);
      } catch (err: any) {
        if (!mounted) return;

        const mockWithFilter = mockProducts.map((p) => ({
          ...p,
          images: p.imageUrl ? [p.imageUrl] : p.images || ['/placeholder-shoes.png'],
          category: p.category?.name || p.category || 'Uncategorized',
          _mock: true,
        }));

        setProducts(mockWithFilter);
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
  }, []);

  const displayProducts = useMemo(() => {
    if (isFromMock) return products;
    const available = products.filter((product: any) => {
      const availableSkus = (product.skus || []).filter((sku: any) => sku.stock > 0);
      return availableSkus.length > 0;
    });
    return available;
  }, [products, isFromMock]);

  return (
    <div className={styles.heroPage}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.heroBadge}>SneakerLocal</span>
          <h1 className={styles.heroTitle}>Sepatu lokal Malang, varian warna dan ukuran lengkap.</h1>
          <p className={styles.heroText}>
            {isFromMock
              ? 'Menampilkan data demo. Setelah backend aktif, harga dan stok akan ter-update otomatis.'
              : 'Jelajahi katalog sepatu untuk mahasiswa: sneakers, kasual, formal, dan sandal dengan filter harga, ukuran, warna, dan stok tersedia.'}
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
            <p className={styles.sectionLabel}>
              {isFromMock ? 'Produk Demo' : 'Katalog Produk'}
            </p>
            <h2 className={styles.sectionTitle}>
              {isFromMock ? 'Koleksi contoh untukPreview' : 'Temukan sepatu sesuai kantong mahasiswa'}
            </h2>
          </div>
          <p className={styles.sectionMeta}>
            {isLoading
              ? 'Memuat...'
              : `Menampilkan ${displayProducts.length} produk dengan stok tersedia.`}
          </p>
        </div>

        {isFromMock && (
          <div className="card" style={{ padding: '12px 16px', marginBottom: '20px', borderLeft: '4px solid var(--color-warning)' }}>
            <p className="text-muted" style={{ margin: 0 }}>
              ⚠️ <strong>Mode Demo:</strong> Menampilkan data contoh. Setelah backend terhubung, data akan otomatis diperbarui dari server.
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
