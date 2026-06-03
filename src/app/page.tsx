'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProductCard from '@/components/shop/ProductCard';
import FilterSidebar from '@/components/shop/FilterSidebar';
import { useShopStore } from '@/store/shop';
import styles from './page.module.css';
export default function HomePage() {
  const router = useRouter();
  const params = useSearchParams();
  const [searchInput, setSearchInput] = useState(params.get('search') ?? '');
  const category = params.get('category') ?? '';
  const color = params.get('color') ?? '';
  const size = Number(params.get('size') ?? '0');
  const minPrice = Number(params.get('minPrice') ?? '0');
  const maxPrice = Number(params.get('maxPrice') ?? '0');
  const search = params.get('search')?.toLowerCase() ?? '';

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const availableSkus = product.skus.filter((sku) => sku.stock > 0);
      if (!availableSkus.length) return false;
      if (category && product.category !== category) return false;
      if (search && ![product.name, product.description].some((field) => field.toLowerCase().includes(search))) return false;
      if (color && !availableSkus.some((sku) => sku.color.toLowerCase() === color.toLowerCase())) return false;
      if (size && !availableSkus.some((sku) => sku.size === size)) return false;
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
            <form
              className={styles.heroSearch}
              onSubmit={(event) => {
                event.preventDefault();
                const query = new URLSearchParams(params.toString());
                if (searchInput.trim()) {
                  query.set('search', searchInput.trim());
                } else {
                  query.delete('search');
                }
                router.push(`/?${query.toString()}`);
              }}
            >
              <input
                type="search"
                placeholder="Cari produk, warna, atau ukuran"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="form-input"
              />
              <button type="submit" className="btn btn-primary btn-lg">
                Cari
              </button>
            </form>
            <Link href="/cart" className="btn btn-primary btn-lg">
              Buka Keranjang
            </Link>
            <Link href="/?category=sandal" className="btn btn-secondary btn-lg">
              Lihat Sandal
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
              filteredProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))
            ) : (
              <div className={styles.emptyState}>
                <p className="text-muted">Tidak ada produk aktif yang sesuai kriteria filter Anda.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
