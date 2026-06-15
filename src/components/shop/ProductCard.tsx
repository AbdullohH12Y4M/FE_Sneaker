'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiShoppingBag, FiHeart } from 'react-icons/fi';
import { useState } from 'react';
import type { Product } from '@/types';
import { formatPrice } from '@/lib/utils';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const [wishlisted, setWishlisted] = useState(false);
  const [imgError, setImgError] = useState(false);

  const uniqueColors = [...new Set((product.skus ?? []).map((s) => s.color))];
  const totalStock = (product.skus ?? []).reduce((sum, s) => sum + s.stock, 0);
  const isOutOfStock = totalStock === 0;

  const displayImage =
    !imgError && product.images?.[0]?.url
      ? product.images[0].url
      : `https://placehold.co/400x400/1a1a24/f97316?text=${encodeURIComponent(product.name.slice(0, 8))}`;

  return (
    <motion.div
      className={`${styles.card} ${isOutOfStock ? styles.outOfStock : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      whileHover={{ y: -4, scale: 1.02 }}
    >
      {/* Image */}
      <Link href={`/products/${product.slug}`} className={styles.imageWrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displayImage}
          alt={product.name}
          className={styles.image}
          loading="lazy"
          onError={() => setImgError(true)}
        />
        {isOutOfStock ? (
          <div className={styles.soldOutBadge}>Habis</div>
        ) : product.discount ? (
          <div className={styles.discountBadge}>-{product.discount}%</div>
        ) : null}
        <div className={styles.overlay}>
          <span className={styles.overlayText}>Lihat Detail</span>
        </div>
      </Link>

      {/* Wishlist */}
      <button
        className={`${styles.wishlistBtn} ${wishlisted ? styles.wishlisted : ''}`}
        onClick={(e) => {
          e.preventDefault();
          setWishlisted(!wishlisted);
        }}
        aria-label="Tambah ke wishlist"
      >
        <FiHeart size={16} style={{ fill: wishlisted ? 'currentColor' : 'transparent' }} />
      </button>


      {/* Info */}
      <div className={styles.info}>
        {/* Color swatches */}
        <div className={styles.swatches}>
          {uniqueColors.slice(0, 5).map((color) => {
            const sku = (product.skus ?? []).find((s) => s.color === color);
            return (
              <span
                key={color}
                className={styles.swatch}
                style={{ background: sku?.colorHex || '#888' }}
                title={color}
              />
            );
          })}
          {uniqueColors.length > 5 && (
            <span className={styles.swatchMore}>+{uniqueColors.length - 5}</span>
          )}
        </div>

        <Link href={`/products/${product.slug}`}>
          <h3 className={styles.name}>{product.name}</h3>
        </Link>

        <div className={styles.footer}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {product.discount && (
              <span style={{ fontSize: '0.75rem', textDecoration: 'line-through', color: 'var(--color-text-faint)' }}>
                {formatPrice(product.basePrice)}
              </span>
            )}
            <span className={`price ${styles.price}`}>
              {formatPrice(product.discount ? product.basePrice * (1 - product.discount / 100) : product.basePrice)}
            </span>
          </div>
          {!isOutOfStock && (
              <Link
                href={`/products/${product.slug}`}
                className={`btn btn-primary btn-sm ${styles.addBtn}`}
              >
                <FiShoppingBag size={14} />
                Beli
              </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className={styles.card}>
      <div className={`${styles.imageWrap} skeleton`} style={{ aspectRatio: '1/1' }} />
      <div className={styles.info}>
        <div className="skeleton" style={{ width: '40%', height: '14px', marginBottom: '12px' }} />
        <div className="skeleton" style={{ width: '80%', height: '20px', marginBottom: '12px' }} />
        <div className="skeleton" style={{ width: '60%', height: '24px' }} />
      </div>
    </div>
  );
}
