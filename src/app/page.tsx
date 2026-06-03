'use client';

import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

import FilterSidebar from '@/components/shop/FilterSidebar';
import ProductCard from '@/components/shop/ProductCard';
import styles from './page.module.css';

import { useShopStore } from '@/store/shop';

export default function HomePage() {
  const { products, fetchProducts } = useShopStore((state) => ({
    products: state.products,
    fetchProducts: state.fetchProducts,
  }));

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const params = useSearchParams();
  const category = params.get('category') ?? '';
  const color = params.get('color') ?? '';
  const size = Number(params.get('size') ?? '0');
  const minPrice = Number(params.get('minPrice') ?? '0');
  const maxPrice = Number(params.get('maxPrice') ?? '0');
  const search = params.get('search')?.toLowerCase() ?? '';

  const filteredProducts = useMemo(() => {
    return products.filter((product: any) => {
      const availableSkus = (product.skus || []).filter((sku: any) => sku.stock > 0);
      if (!availableSkus.length) return false;

      if (category && product.category !== category) return false;

      if (search) {
        const name = String(product.name ?? '');
        const desc = String(product.description ?? '');
        if (![name, desc].some((field) => field.toLowerCase().includes(search))) return false;
      }

      if (color && !availableSkus.some((sku: any) => String(sku.color ?? '').toLowerCase() === color.toLowerCase())) return false;
      if (size && !availableSkus.some((sku: any) => sku.size === size)) return false;

      if (minPrice && !availableSkus.some((sku: any) => (sku.price ?? product.basePrice) >= minPrice)) return false;
      if (maxPrice && maxPrice > 0 && !availableSkus.some((sku: any) => (sku.price ?? product.basePrice) <= maxPrice)) return false;

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
            <Link href="/?category=SNEAKERS" className="btn btn-secondary btn-lg">
              Lihat Sneakers
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
            Menampilkan <strong>{filteredProducts.length}</strong> produk dengan stok tersedia.
          </p>
        </div>

        <div className={styles.shopGrid}>
          <div className={styles.sidebarWrapper}>
            <FilterSidebar />
          </div>
          <div className={styles.productGrid}>
            {filteredProducts.length ? (
              filteredProducts.map((product: any, index: number) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))
            ) : (
              <div className={styles.emptyState}>
                <p className="text-muted">Tidak ada produk sesuai filter. Coba ubah kategori, warna, atau ukuran.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

