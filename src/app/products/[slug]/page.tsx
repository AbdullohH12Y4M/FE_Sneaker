'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ShoppingBag, ArrowLeft, Star, Send, User } from 'lucide-react';

import { useCartStore } from '@/store/cart';
import { productsApi } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { Product, ProductSKU } from '@/types';
import { mockProducts } from '@/data/mockProducts';
import styles from './ProductDetail.module.css';

// ─── Mock Reviews ─────────────────────────────────────────────────────────────
const MOCK_REVIEWS = [
  {
    id: 'r1',
    name: 'Andi Firmansyah',
    avatar: 'AF',
    rating: 5,
    date: '2 hari lalu',
    comment: 'Kualitas mantap, harga mahasiswa banget! Sol nyaman buat jalan-jalan kampus seharian. Warna hitamnya juga elegan.',
  },
  {
    id: 'r2',
    name: 'Siti Rahayu',
    avatar: 'SR',
    rating: 4,
    date: '1 minggu lalu',
    comment: 'Pengiriman cepat ke Lowokwaru, ongkirnya flat Rp10rb saja. Sepatunya sesuai foto, ukuran juga pas. Recommended!',
  },
  {
    id: 'r3',
    name: 'Budi Santoso',
    avatar: 'BS',
    rating: 5,
    date: '2 minggu lalu',
    comment: 'Udah beli 2 pasang, kualitasnya konsisten. Bahan breathable cocok buat iklim Malang yang kadang panas.',
  },
];

// ─── Star Component ───────────────────────────────────────────────────────────
function StarRating({ rating, max = 5, size = 16, interactive = false, onChange }: {
  rating: number;
  max?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (r: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className={styles.starRow}>
      {Array.from({ length: max }).map((_, i) => {
        const val = i + 1;
        const filled = interactive ? val <= (hover || rating) : val <= rating;
        return (
          <Star
            key={i}
            size={size}
            className={`${styles.star} ${filled ? styles.starFilled : styles.starEmpty}`}
            onMouseEnter={() => interactive && setHover(val)}
            onMouseLeave={() => interactive && setHover(0)}
            onClick={() => interactive && onChange?.(val)}
            style={{ cursor: interactive ? 'pointer' : 'default' }}
          />
        );
      })}
    </div>
  );
}

// ─── Review Card ──────────────────────────────────────────────────────────────
function ReviewCard({ review }: { review: typeof MOCK_REVIEWS[number] }) {
  return (
    <div className={styles.reviewCard}>
      <div className={styles.reviewHeader}>
        <div className={styles.reviewAvatar}>{review.avatar}</div>
        <div>
          <p className={styles.reviewName}>{review.name}</p>
          <p className={styles.reviewDate}>{review.date}</p>
        </div>
        <StarRating rating={review.rating} size={14} />
      </div>
      <p className={styles.reviewComment}>{review.comment}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFromMock, setIsFromMock] = useState(false);

  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState('');
  const [activeImage, setActiveImage] = useState('');

  // Reviews state
  const [reviews, setReviews] = useState(MOCK_REVIEWS);
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Load product
  useEffect(() => {
    let mounted = true;
    if (!slug || typeof slug !== 'string') { setLoading(false); return; }

    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await productsApi.getBySlug(slug);
        const data = res.data;
        if (!mounted) return;
        // Normalize category from API
        const normalized = {
          ...data,
          category:
            typeof data.category === 'object' && data.category !== null
              ? (data.category.name ?? data.category.slug ?? 'Uncategorized')
              : (data.category || 'Uncategorized'),
          images: data.images?.length ? data.images : ['/placeholder-shoes.png'],
          // Normalize SKUs: flatten inventory.stock → stock
          skus: (data.skus ?? []).map((sku: any) => ({
            ...sku,
            stock: typeof sku.stock === 'number'
              ? sku.stock
              : (sku.inventory?.stock ?? 0),
          })),
        };
        setProduct(normalized);
        setActiveImage(normalized.images[0]);
        setIsFromMock(false);
      } catch {
        if (!mounted) return;
        // Fallback to mock
        const found = mockProducts.find((p) => p.slug === slug);
        if (found) {
          const mockNorm = {
            ...found,
            category:
              (typeof found.category === 'string'
                ? found.category
                : (found.category as any)?.name ?? 'Uncategorized'),
            images: found.images?.length ? found.images : ['/placeholder-shoes.png'],
          };
          setProduct(mockNorm as any);
          setActiveImage(mockNorm.images[0]);
          setIsFromMock(true);
        } else {
          setError('Produk tidak ditemukan atau tidak aktif.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [slug]);

  const availableColors = useMemo(() => {
    if (!product) return [];
    return Array.from(new Set<string>(
      (product.skus || []).filter((s: ProductSKU) => s.stock > 0).map((s: ProductSKU) => s.color as string)
    ));
  }, [product]);

  const availableSizes = useMemo(() => {
    if (!product || !selectedColor) return [] as number[];
    return (product.skus || [])
      .filter((sku: ProductSKU) => sku.color === selectedColor && sku.stock > 0)
      .map((sku: ProductSKU) => sku.sizeEU)
      .sort((a: number, b: number) => a - b);
  }, [product, selectedColor]);

  const selectedSku = useMemo<ProductSKU | null>(() => {
    if (!product || !selectedColor || selectedSize === null) return null;
    return (product.skus || []).find(
      (sku: ProductSKU) => sku.color === selectedColor && sku.sizeEU === selectedSize
    ) ?? null;
  }, [product, selectedColor, selectedSize]);

  const fallbackImage = 'https://placehold.co/600x600/1a1a24/f97316?text=SneakerLocal';
  const displayImage = activeImage || fallbackImage;

  useEffect(() => {
    if (availableColors.length && !selectedColor) setSelectedColor(availableColors[0]);
  }, [availableColors, selectedColor]);

  useEffect(() => {
    if (selectedColor && availableSizes.length && selectedSize === null)
      setSelectedSize(availableSizes[0]);
  }, [selectedColor, availableSizes, selectedSize]);

  const stockLabel = selectedSku ? `${selectedSku.stock} tersisa` : 'Pilih varian';

  const handleAddToCart = () => {
    if (!selectedSku) { setStatus('Pilih warna dan ukuran yang tersedia.'); return; }
    if (!product) return;
    if (selectedSku.stock < quantity) { setStatus(`Stok hanya ${selectedSku.stock}.`); return; }
    addItem({
      skuId: selectedSku.id,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      image: displayImage,
      color: selectedSku.color,
      colorHex: selectedSku.colorHex,
      sizeEU: selectedSku.sizeEU,
      price: selectedSku.price ?? product.basePrice,
      quantity,
      maxStock: selectedSku.stock,
    });
    setStatus('✅ Berhasil ditambahkan ke keranjang!');
    setTimeout(() => setStatus(''), 3000);
  };

  const handleSubmitReview = () => {
    if (!reviewName.trim() || !reviewComment.trim()) return;
    const newReview = {
      id: `r-${Date.now()}`,
      name: reviewName.trim(),
      avatar: reviewName.trim().split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2),
      rating: reviewRating,
      date: 'Baru saja',
      comment: reviewComment.trim(),
    };
    setReviews([newReview, ...reviews]);
    setReviewName('');
    setReviewRating(5);
    setReviewComment('');
    setReviewSubmitted(true);
    setTimeout(() => setReviewSubmitted(false), 4000);
  };

  const currentPrice = product
    ? selectedSku?.price                          // SKU-level price override (if set)
      ?? (product.discount
        ? product.basePrice * (1 - product.discount / 100)
        : product.basePrice)
    : 0;

  const avgRating = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="container" style={{ padding: '60px 0' }}>
        <div className={styles.skeletonLayout}>
          <div className={`${styles.skeletonImage} skeleton`} />
          <div className={styles.skeletonInfo}>
            <div className="skeleton" style={{ height: 16, width: '30%', borderRadius: 8 }} />
            <div className="skeleton" style={{ height: 36, width: '70%', borderRadius: 8 }} />
            <div className="skeleton" style={{ height: 14, width: '90%', borderRadius: 8 }} />
            <div className="skeleton" style={{ height: 14, width: '80%', borderRadius: 8 }} />
            <div className="skeleton" style={{ height: 48, width: '40%', borderRadius: 8, marginTop: 16 }} />
          </div>
        </div>
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────
  if (error || !product) {
    return (
      <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <p style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</p>
        <h1>Produk tidak ditemukan</h1>
        <p className="text-muted" style={{ marginTop: 8 }}>{error || 'Produk yang Anda cari tidak tersedia.'}</p>
        <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={() => router.push('/')}>
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  // ─── Main ─────────────────────────────────────────────────────────────────
  return (
    <div className="container" style={{ padding: '32px 0 64px' }}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumbs}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.back()}>
          <ArrowLeft size={16} /> Kembali
        </button>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbCurrent}>{product.name}</span>
      </div>

      {/* Demo banner */}
      {isFromMock && (
        <div className="card" style={{ padding: '10px 16px', marginBottom: 24, borderLeft: '4px solid var(--color-warning)' }}>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
            ⚠️ <strong>Mode Demo:</strong> Menampilkan data contoh. Detail lengkap tersedia setelah backend terhubung.
          </p>
        </div>
      )}

      {/* Product Layout */}
      <div className={styles.productLayout}>
        {/* Image Panel */}
        <div className={styles.imagePanel}>
          <div className={styles.mainImageWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={displayImage} alt={product.name} className={styles.productImage} />
            {product.discount && (
              <div className={styles.discountBadge}>-{product.discount}%</div>
            )}
          </div>
          {product.images && product.images.length > 1 && (
            <div className={styles.galleryRow}>
              {(product.images as string[]).map((img: string, idx: number) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={idx}
                  src={img}
                  alt={`${product.name} ${idx + 1}`}
                  className={`${styles.thumbnail} ${activeImage === img ? styles.thumbnailActive : ''}`}
                  onClick={() => setActiveImage(img)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Details Panel */}
        <div className={styles.detailsPanel}>
          <div className={styles.labelRow}>
            <span className="badge badge-primary">
              {typeof product.category === 'string' ? product.category.toLowerCase() : 'uncategorized'}
            </span>
            <span className={styles.stockBadge}>{stockLabel}</span>
          </div>

          <h1 className={styles.productTitle}>{product.name}</h1>

          {/* Rating summary */}
          <div className={styles.ratingRow}>
            <StarRating rating={avgRating} size={16} />
            <span className={styles.ratingScore}>{avgRating}</span>
            <span className="text-muted" style={{ fontSize: '0.875rem' }}>({reviews.length} ulasan)</span>
          </div>

          <p className={styles.description}>{product.description}</p>

          {/* Price — updates when SKU with price override is selected */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {product.discount && !selectedSku?.price && (
              <span style={{ fontSize: '1rem', textDecoration: 'line-through', color: 'var(--color-text-faint)' }}>
                {formatPrice(product.basePrice)}
              </span>
            )}
            <p className={`${styles.price} price-xl`}>{formatPrice(currentPrice)}</p>
            {selectedSku?.price && selectedSku.price !== product.basePrice && (
              <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                Harga dasar: {formatPrice(product.basePrice)}
              </p>
            )}
          </div>

          <hr className="divider" />

          {/* Variants */}
          <div className={styles.variantSection}>
            <div>
              <p className={styles.variantLabel}>Warna</p>
              <div className={styles.colorRow}>
                {availableColors.length ? (
                  availableColors.map((color: string) => {
                    const sku = (product.skus || []).find((item: ProductSKU) => item.color === color);
                    return (
                      <button
                        key={color}
                        type="button"
                        className={`${styles.colorPill} ${selectedColor === color ? styles.colorPillActive : ''}`}
                        onClick={() => { setSelectedColor(color); setSelectedSize(null); setStatus(''); }}
                        style={{ '--pill-color': sku?.colorHex || '#888' } as React.CSSProperties}
                      >
                        <span className={styles.colorDot} style={{ background: sku?.colorHex || '#888' }} />
                        {color}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-muted">Tidak ada varian warna tersedia.</p>
                )}
              </div>
            </div>

            <div className={styles.sizeSection}>
              <p className={styles.variantLabel}>Ukuran (EU)</p>
              <div className={styles.sizeRow}>
                {availableSizes.length ? (
                  // Show all sizes for selected color, disable out-of-stock ones
                  (product.skus || [])
                    .filter((sku: ProductSKU) => sku.color === selectedColor)
                    .sort((a: ProductSKU, b: ProductSKU) => a.sizeEU - b.sizeEU)
                    .map((sku: ProductSKU) => (
                      <button
                        key={sku.sizeEU}
                        type="button"
                        className={`${styles.sizePill} ${selectedSize === sku.sizeEU ? styles.sizePillActive : ''}`}
                        onClick={() => { if (sku.stock > 0) { setSelectedSize(sku.sizeEU); setStatus(''); } }}
                        disabled={sku.stock === 0}
                        title={sku.stock === 0 ? 'Stok habis' : `${sku.stock} tersisa`}
                        style={{ opacity: sku.stock === 0 ? 0.35 : 1, cursor: sku.stock === 0 ? 'not-allowed' : 'pointer', position: 'relative', textDecoration: sku.stock === 0 ? 'line-through' : 'none' }}
                      >
                        {sku.sizeEU}
                      </button>
                    ))
                ) : (
                  <p className="text-muted">Pilih warna terlebih dahulu.</p>
                )}
              </div>
              {selectedSku && (
                <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 6 }}>
                  {selectedSku.stock > 0 ? `${selectedSku.stock} unit tersisa` : 'Stok habis'}
                </p>
              )}
            </div>
          </div>

          <hr className="divider" />

          {/* Actions */}
          <div className={styles.actionsRow}>
            <div className={styles.quantityControl}>
              <button type="button" className="btn btn-secondary btn-sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
              <input
                className="form-input"
                type="number"
                min={1}
                max={selectedSku?.stock ?? 10}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              />
              <button type="button" className="btn btn-secondary btn-sm"
                onClick={() => setQuantity((prev) => Math.min(prev + 1, selectedSku?.stock ?? prev + 1))}>+</button>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={handleAddToCart}
              disabled={!selectedSku || selectedSku.stock === 0}
              style={{ flex: 1 }}
            >
              <ShoppingBag size={18} /> Tambah ke Keranjang
            </button>
          </div>

          {status && (
            <p className={styles.statusMessage} style={{ color: status.startsWith('✅') ? 'var(--color-success)' : 'var(--color-warning)' }}>
              {status}
            </p>
          )}

          <div className={styles.extraInfo}>
            <p className="text-muted">🚚 Flat ongkir Rp10.000 untuk area Malang Raya.</p>
            <p className="text-muted">🛡️ Garansi kualitas produk lokal Malang.</p>
          </div>
        </div>
      </div>

      {/* ─── Reviews Section ──────────────────────────────────────────────── */}
      <div className={styles.reviewsSection}>
        <div className={styles.reviewsSectionHeader}>
          <h2 className={styles.reviewsTitle}>Ulasan Pembeli</h2>
          <div className={styles.reviewsSummary}>
            <span className={styles.reviewsAvg}>{avgRating}</span>
            <StarRating rating={avgRating} size={20} />
            <span className="text-muted">dari {reviews.length} ulasan</span>
          </div>
        </div>

        {/* Review List */}
        <div className={styles.reviewsList}>
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>

        {/* Add Review Form */}
        <div className={styles.reviewForm}>
          <h3 className={styles.reviewFormTitle}>
            <User size={18} /> Tulis Ulasan
          </h3>

          {reviewSubmitted && (
            <div className={styles.reviewSuccess}>
              ✅ Terima kasih! Ulasan Anda telah ditambahkan.
            </div>
          )}

          <div className={styles.reviewFormGrid}>
            <div className="form-group">
              <label className="form-label">Nama</label>
              <input
                className="form-input"
                placeholder="Nama Anda"
                value={reviewName}
                onChange={(e) => setReviewName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Rating</label>
              <StarRating
                rating={reviewRating}
                size={24}
                interactive
                onChange={setReviewRating}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label">Komentar</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Bagikan pengalaman Anda dengan produk ini..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 12 }}
            onClick={handleSubmitReview}
            disabled={!reviewName.trim() || !reviewComment.trim()}
          >
            <Send size={16} /> Kirim Ulasan
          </button>
        </div>
      </div>
    </div>
  );
}
