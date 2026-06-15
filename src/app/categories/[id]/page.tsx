'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { categoriesApi, productsApi } from '@/lib/api';
import { parseProductsList } from '@/lib/api-helpers';
import type { Category, Product } from '@/types';
import ProductCard from '@/components/shop/ProductCard';
import styles from './page.module.css';

export default function CategoryDetailPage() {
  const params = useParams<{ id: string }>();
  const categoryId = params.id;
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCategoryDetail = useCallback(async () => {
    if (!categoryId) return;
    try {
      setLoading(true);
      // categoriesApi.getOne handles both UUID and slug (API now supports both)
      const catRes = await categoriesApi.getOne(categoryId);
      const cat = catRes.data as Category;
      setCategory(cat);

      // getAllPublic hits /api/products/all which returns data with SKUs + stock
      // It now accepts optional ?categorySlug= filter
      const prodRes = await productsApi.getAllPublic({
        categorySlug: cat.slug,
      });
      setProducts(parseProductsList(prodRes.data));
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data kategori.');
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    fetchCategoryDetail();
  }, [fetchCategoryDetail]);

  if (loading) {
    return (
      <div className={`${styles.categoryDetail} container`} style={{ padding: '40px 0', textAlign: 'center' }}>
        <p>Memuat detail kategori...</p>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className={`${styles.categoryDetail} container`} style={{ padding: '40px 0', textAlign: 'center' }}>
        <h1>Kategori tidak ditemukan</h1>
        <p className="form-error">{error || 'Kategori yang Anda cari tidak tersedia.'}</p>
        <Link href="/" className="btn btn-primary">Kembali ke Beranda</Link>
      </div>
    );
  }

  return (
    <div className={`${styles.categoryDetail} container`} style={{ padding: '40px 0' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/" className="btn btn-ghost btn-sm">← Kembali ke Beranda</Link>
      </div>

      <div className="card" style={{ padding: '32px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span className="badge badge-primary" style={{ marginBottom: '12px', display: 'inline-block' }}>{category.slug}</span>
            <h1 className={`${styles.categoryTitle}`}>{category.name}</h1>
            {category.description && (
              <p className="text-muted" style={{ marginTop: '8px', maxWidth: '600px' }}>{category.description}</p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="text-muted">Status</p>
            <span className={`badge ${category.isActive ? 'badge-success' : 'badge-danger'}`} style={{ marginTop: '4px', display: 'inline-block' }}>
              {category.isActive ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h2>Produk dalam Kategori Ini</h2>
        <p className="text-muted">{products.length} produk tersedia</p>
      </div>

      {products.length === 0 ? (
        <div className={styles.categoryEmpty}>
          <p className="text-muted">Belum ada produk di kategori ini.</p>
        </div>
      ) : (
        <div className={styles.categoryProductsGrid}>
          {products.map((product, index) => (
            <ProductCard key={product.id ?? product.slug ?? index} product={product} index={index} />
          ))}
        </div> 
      )}
    </div>
  );
}
