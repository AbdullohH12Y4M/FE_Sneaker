'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useCartStore } from '@/store/cart';
import { formatPrice } from '@/lib/utils';
import styles from './page.module.css';

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const getTotalPrice = useCartStore((state) => state.getTotalPrice);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const { data: session } = useSession();
  const [message, setMessage] = useState('');

  const totalPrice = getTotalPrice();

  const handleQuantityChange = (skuId: string, value: number, maxStock: number) => {
    if (value > maxStock) {
      setMessage(`Stok maksimal untuk item ini adalah ${maxStock}.`);
      updateQuantity(skuId, maxStock);
      return;
    }
    updateQuantity(skuId, Math.max(1, value));
    setMessage('');
  };

  return (
    <div className="container" style={{ padding: '40px 0' }}>
      <div className={styles.headerRow}>
        <div>
          <p className="sectionLabel">Keranjang Belanja</p>
          <h1 className="sectionTitle">Review dan kelola produk Anda</h1>
        </div>
        <div className={styles.metaRow}>
          {session ? (
            <span className="badge badge-info">Login sebagai {session.user?.name}</span>
          ) : (
            <span className="badge badge-warning">Guest cart disimpan di browser</span>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Keranjang Anda kosong.</p>
          <Link href="/" className="btn btn-primary btn-sm">
            Kembali ke toko
          </Link>
        </div>
      ) : (
        <div className={styles.cartLayout}>
          <div className={styles.itemsPanel}>
            <div className={styles.cartTable}>
              <div className={styles.cartRowHeader}>
                <span>Produk</span>
                <span>Harga</span>
                <span>Jumlah</span>
                <span>Subtotal</span>
              </div>
              {items.map((item) => (
                <div className={styles.cartRow} key={item.skuId}>
                  <div className={styles.productCell}>
                    <img src={item.image} alt={item.productName} className={styles.cartImage} />
                    <div>
                      <Link href={`/products/${item.productSlug}`} className={styles.productName}>
                        {item.productName}
                      </Link>
                      <p className="text-muted">{item.color} • EU {item.sizeEU}</p>
                      <button className="btn btn-ghost btn-sm" onClick={() => removeItem(item.skuId)}>
                        Hapus
                      </button>
                    </div>
                  </div>
                  <div>{formatPrice(item.price)}</div>
                  <div>
                    <div className={styles.quantityGroup}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleQuantityChange(item.skuId, item.quantity - 1, item.maxStock)}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={item.maxStock}
                        value={item.quantity}
                        onChange={(event) => handleQuantityChange(item.skuId, Number(event.target.value), item.maxStock)}
                        className="form-input"
                      />
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleQuantityChange(item.skuId, item.quantity + 1, item.maxStock)}
                      >
                        +
                      </button>
                    </div>
                    <p className="text-muted">Stok {item.maxStock}</p>
                  </div>
                  <div>{formatPrice(item.price * item.quantity)}</div>
                </div>
              ))}
            </div>
          </div>

          <aside className={styles.summaryPanel}>
            <div className="card" style={{ padding: '24px' }}>
              <h2>Total Pesanan</h2>
              <div className={styles.summaryRow}>
                <span>Total</span>
                <strong>{formatPrice(totalPrice)}</strong>
              </div>
              <p className="text-muted">Harga sudah termasuk validasi stok. Akan ada pemeriksaan terakhir saat checkout.</p>
              <div className={styles.summaryButtons}>
                <Link href="/checkout" className="btn btn-primary btn-full">
                  Lanjut ke Checkout
                </Link>
                <button className="btn btn-secondary btn-full" onClick={clearCart}>
                  Kosongkan Keranjang
                </button>
              </div>
              {message && <p className="form-error">{message}</p>}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
