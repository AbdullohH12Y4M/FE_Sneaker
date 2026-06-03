'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ShoppingBag, ArrowLeft } from 'lucide-react';

import { useCartStore } from '@/store/cart';
import { useShopStore } from '@/store/shop';
import { formatPrice } from '@/lib/utils';
import styles from './ProductDetail.module.css';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const products = useShopStore((state) => state.products);
  const addItem = useCartStore((state) => state.addItem);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState('');

  const product = useMemo(
    () => products.find((item) => item.slug === slug),
    [products, slug]
  );


  const [activeImage, setActiveImage] = useState('');
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (product && product.images && product.images.length > 0) {
      setActiveImage(product.images[0]);
    }
  }, [product]);

  if (!product) {
    return (
      <div className="container" style={{ padding: '40px 0' }}>
        <div style={{ textAlign: 'center' }}>
          <h1>Produk tidak ditemukan</h1>
          <p>Produk yang Anda cari tidak tersedia.</p>
          <button className="btn btn-primary" onClick={() => router.push('/')}>
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }


  const availableColors = useMemo(() => {
    return Array.from(new Set<string>((product.skus || []).filter((sku: any) => sku.stock > 0).map((sku: any) => sku.color as string)));
  }, [product]);

  const availableSizes = useMemo(() => {
    if (!selectedColor) return [];
    return (product.skus || [])
      .filter((sku: any) => sku.color === selectedColor && sku.stock > 0)
      .map((sku: any) => sku.size)
      .sort((a: any, b: any) => a - b);
  }, [product, selectedColor]);

  const selectedSku = useMemo(() => {
    if (!selectedColor || selectedSize === null) return null;
    return (product.skus || []).find((sku: any) => sku.color === selectedColor && sku.size === selectedSize) ?? null;
  }, [product, selectedColor, selectedSize]);

  const fallbackImage = 'https://placehold.co/600x600/1a1a24/f97316?text=SneakerLocal';
  const displayImage = activeImage || fallbackImage;

  useEffect(() => {
    if (availableColors.length && !selectedColor) {
      setSelectedColor(availableColors[0]);
    }
  }, [availableColors, selectedColor]);

  useEffect(() => {
    if (selectedColor && availableSizes.length && selectedSize === null) {
      setSelectedSize(availableSizes[0]);
    }
  }, [selectedColor, availableSizes, selectedSize]);

  const stockLabel = selectedSku ? `${selectedSku.stock} tersisa` : 'Pilih varian warna dan ukuran';

  const handleAddToCart = () => {
    if (!selectedSku) {
      setStatus('Pilih warna dan ukuran yang tersedia.');
      return;
    }
    if (selectedSku.stock < quantity) {
      setStatus(`Stok hanya ${selectedSku.stock}.`);
      return;
    }
    addItem({
      skuId: selectedSku.id,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      image: displayImage,
      color: selectedSku.color,
      colorHex: selectedSku.colorHex,
      size: selectedSku.size,
      price: selectedSku.price ?? product.basePrice,
      quantity,
      maxStock: selectedSku.stock,
    });
    setStatus('Berhasil ditambahkan ke keranjang.');
  };

  const currentPrice = product.discount 
    ? product.basePrice * (1 - product.discount / 100) 
    : product.basePrice;

  return (
    <div className="container" style={{ padding: '40px 0' }}>
      <div className={styles.breadcrumbs}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.back()}>
          <ArrowLeft size={16} /> Kembali
        </button>
      </div>

      <div className={styles.productLayout}>
        <div className={styles.imagePanel}>
          <div 
            className={styles.mainImageWrap}
            onClick={() => setIsZoomed(!isZoomed)}
            onMouseLeave={() => setIsZoomed(false)}
          >
            <img 
              src={displayImage} 
              alt={product.name} 
              className={`${styles.productImage} ${isZoomed ? styles.productImageZoomed : ''}`} 
            />
          </div>
          {product.images && product.images.length > 1 && (
            <div className={styles.galleryRow}>
              {(product.images as string[]).map((img: string, idx: number) => (
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

        <div className={styles.detailsPanel}>
          <div className={styles.labelRow}>
            <span className="badge badge-primary">{product.category.toLowerCase()}</span>
            <span className={styles.stockBadge}>{stockLabel}</span>
          </div>
          <h1 className={styles.productTitle}>{product.name}</h1>
          <p className={styles.description}>{product.description}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {product.discount && (
              <span style={{ fontSize: '1.1rem', textDecoration: 'line-through', color: 'var(--color-text-faint)' }}>
                {formatPrice(product.basePrice)}
              </span>
            )}
            <p className={`${styles.price} price-xl`}>{formatPrice(currentPrice)}</p>
          </div>

          <div className={styles.variantSection}>
            <div>
              <p className={styles.variantLabel}>Warna</p>
              <div className={styles.colorRow}>
                {availableColors.length ? (
                  availableColors.map((color) => {
                    const sku = (product.skus || []).find((item: any) => item.color === color);
                    return (
                      <button
                        key={color}
                        type="button"
                        className={`${styles.colorPill} ${selectedColor === color ? styles.colorPillActive : ''}`}
                        onClick={() => {
                          setSelectedColor(color);
                          setSelectedSize(null);
                          setStatus('');
                        }}
                        style={{ background: sku?.colorHex || '#888' }}
                      >
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
              <p className={styles.variantLabel}>Ukuran</p>
              <div className={styles.sizeRow}>
                {availableSizes.length ? (
                  (availableSizes as number[]).map((size: number) => (
                    <button
                      key={size}
                      type="button"
                      className={`${styles.sizePill} ${selectedSize === size ? styles.sizePillActive : ''}`}
                      onClick={() => { setSelectedSize(size); setStatus(''); }}
                    >
                      {size}
                    </button>
                  ))
                ) : (
                  <p className="text-muted">Pilih warna terlebih dahulu.</p>
                )}
              </div>
            </div>
          </div>

          <div className={styles.actionsRow}>
            <div className={styles.quantityControl}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
              <input
                className="form-input"
                type="number"
                min={1}
                max={selectedSku?.stock ?? 10}
                value={quantity}
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setQuantity((prev) => Math.min(prev + 1, selectedSku?.stock ?? prev + 1))}>+</button>
            </div>
            <button type="button" className="btn btn-primary btn-lg" onClick={handleAddToCart} disabled={!selectedSku || selectedSku.stock === 0}>
              <ShoppingBag size={18} /> Tambah ke Keranjang
            </button>
          </div>
          {status && <p className={styles.statusMessage}>{status}</p>}

          <div className={styles.extraInfo}>
            <p className="text-muted">Pesanan disimpan di keranjang guest hingga Anda login.</p>
            <p className="text-muted">Jika stok berubah saat checkout, sistem akan menolak kuantitas di atas stok tersedia.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
