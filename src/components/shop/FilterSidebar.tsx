'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import styles from './FilterSidebar.module.css';

interface FilterSidebarProps {
  categories: string[];
  /** Warna unik dari produk server — jika tidak diberikan, kosong */
  colors?: { name: string; hex: string }[];
  /** Ukuran EU unik dari produk server */
  sizes?: number[];
}

const PRICE_RANGES = [
  { label: 'Semua Harga', min: 0, max: 0 },
  { label: 'Di bawah Rp100k', min: 0, max: 100000 },
  { label: 'Rp100k – Rp250k', min: 100000, max: 250000 },
  { label: 'Rp250k – Rp500k', min: 250000, max: 500000 },
  { label: 'Rp500k – Rp1jt', min: 500000, max: 1000000 },
  { label: 'Di atas Rp1jt', min: 1000000, max: 0 },
];

export default function FilterSidebar({ categories, colors = [], sizes = [] }: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      next.delete('page');
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [router, params, pathname]
  );

  const activeCategory = params.get('category') || '';
  const activeColor = params.get('color') || '';
  const activeSize = params.get('size') || '';
  const activeMin = params.get('minPrice') || '';
  const activeMax = params.get('maxPrice') || '';
  const hasFilters = !!(activeCategory || activeColor || activeSize || activeMin || activeMax);

  const clearAll = () => {
    router.push(pathname, { scroll: false });
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} />
          <span className={styles.headerTitle}>Filter</span>
        </div>
        {hasFilters && (
          <button className={styles.clearBtn} onClick={clearAll}>
            <X size={14} /> Reset
          </button>
        )}
      </div>

      {/* Category */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Kategori</h3>
        <div className={styles.optionList}>
          <button
            className={`${styles.option} ${!activeCategory ? styles.optionActive : ''}`}
            onClick={() => updateParam('category', null)}
          >
            Semua
          </button>

          {(categories ?? []).map((cat) => {
            const key = String(cat);
            return (
              <button
                key={key}
                className={`${styles.option} ${activeCategory === key ? styles.optionActive : ''}`}
                onClick={() => updateParam('category', key)}
              >
                {key}
              </button>
            );
          })}
        </div>
      </div>

      <hr className="divider" />

      {/* Price Range */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Range Harga</h3>
        <div className={styles.optionList}>
          {PRICE_RANGES.map((range) => {
            const isActive =
              activeMin === String(range.min) &&
              activeMax === String(range.max);
            return (
              <button
                key={range.label}
                className={`${styles.option} ${isActive ? styles.optionActive : ''}`}
                onClick={() => {
                  if (range.min === 0 && range.max === 0) {
                    updateParam('minPrice', null);
                    updateParam('maxPrice', null);
                  } else {
                    updateParam('minPrice', String(range.min));
                    updateParam('maxPrice', String(range.max));
                  }
                }}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Color — dynamic from server data */}
      {colors.length > 0 && (
        <>
          <hr className="divider" />
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Warna</h3>
            <div className={styles.colorGrid}>
              {colors.map((color) => (
                <button
                  key={color.name}
                  className={`${styles.colorBtn} ${activeColor === color.name ? styles.colorBtnActive : ''}`}
                  onClick={() => updateParam('color', activeColor === color.name ? null : color.name)}
                  title={color.name}
                >
                  <span className={styles.colorDot} style={{ background: color.hex }} />
                  <span className={styles.colorLabel}>{color.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Size — dynamic from server data */}
      {sizes.length > 0 && (
        <>
          <hr className="divider" />
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Ukuran (EU)</h3>
            <div className={styles.sizeGrid}>
              {sizes.map((size) => (
                <button
                  key={size}
                  className={`${styles.sizeBtn} ${activeSize === String(size) ? styles.sizeBtnActive : ''}`}
                  onClick={() => updateParam('size', activeSize === String(size) ? null : String(size))}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
