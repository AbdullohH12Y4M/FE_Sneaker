'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MALANG_DISTRICTS, formatPrice, extractErrorMessage } from '@/lib/utils';
import { useCartStore } from '@/store/cart';
import { ordersApi } from '@/lib/api';
import styles from './page.module.css';

export default function CheckoutPage() {
  const items = useCartStore((state) => state.items);
  const getTotalPrice = useCartStore((state) => state.getTotalPrice);
  const clearCart = useCartStore((state) => state.clearCart);
  const { data: session } = useSession();
  const router = useRouter();

  const [shippingType, setShippingType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [district, setDistrict] = useState('LOWOKWARU');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const subtotal = getTotalPrice();
  // Flat shipping fee matching backend AppSetting — Rp10.000 per delivery
  const FLAT_SHIPPING_FEE = 10_000;
  const estimatedShipping = shippingType === 'DELIVERY' ? FLAT_SHIPPING_FEE : 0;
  const estimatedTotal = subtotal + estimatedShipping;

  const canSubmit = items.length > 0 && (shippingType === 'PICKUP' || address.trim().length > 5);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (!session) {
      setErrorMessage('Silakan login terlebih dahulu.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const checkoutData = {
        items: items.map((item) => ({
          productSkuId: item.skuId,
          quantity: item.quantity,
        })),
        shippingType,
        shippingDistrict: shippingType === 'DELIVERY' ? district : undefined,
        shippingAddress: shippingType === 'DELIVERY' ? address : undefined,
        notes: notes || undefined,
        paymentMethod: 'MANUAL_TRANSFER',
      };

      const response = await ordersApi.checkout(checkoutData);
      const order = response.data;
      const orderId = (order as { id?: string })?.id;

      clearCart();
      setSuccessMessage('Pesanan berhasil dibuat. Silakan lanjutkan ke pembayaran.');
      
      setTimeout(() => {
        if (orderId) {
          router.push(`/orders/${orderId}`);
        } else {
          router.push('/orders');
        }
      }, 2000);
    } catch (error: any) {
      setErrorMessage(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '40px 0' }}>
      <div className={styles.checkoutHeader}>
        <div>
          <p className="sectionLabel">Checkout</p>
          <h1 className="sectionTitle">Lengkapi pesanan Anda</h1>
        </div>
      </div>

      {items.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Tidak ada item di keranjang. Tambahkan produk terlebih dahulu sebelum checkout.</p>
        </div>
      ) : (
        <div className={styles.checkoutGrid}>
          <section className={styles.formPanel}>
            <div className={styles.fieldGroup}>
              <p className={styles.fieldLabel}>Tipe Pengiriman</p>
              <div className={styles.optionRow}>
                <button
                  type="button"
                  className={`${styles.optionBtn} ${shippingType === 'DELIVERY' ? styles.optionActive : ''}`}
                  onClick={() => setShippingType('DELIVERY')}
                >
                  Antar (DELIVERY)
                </button>
                <button
                  type="button"
                  className={`${styles.optionBtn} ${shippingType === 'PICKUP' ? styles.optionActive : ''}`}
                  onClick={() => setShippingType('PICKUP')}
                >
                  Ambil Sendiri (PICKUP)
                </button>
              </div>
            </div>

            {shippingType === 'DELIVERY' && (
              <>
                <div className={styles.fieldGroup}>
                  <label className="form-label" htmlFor="district">
                    Kecamatan
                  </label>
                  <select
                    id="district"
                    className="form-select"
                    value={district}
                    onChange={(event) => setDistrict(event.target.value)}
                  >
                    {MALANG_DISTRICTS.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.fieldGroup}>
                  <label className="form-label" htmlFor="address">
                    Alamat / Lokasi
                  </label>
                  <input
                    id="address"
                    className="form-input"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="Contoh: Jl. Dieng III No. 12, Lowokwaru"
                  />
                </div>
              </>
            )}

            <div className={styles.fieldGroup}>
              <label className="form-label" htmlFor="notes">
                Catatan Pesanan (opsional)
              </label>
              <textarea
                id="notes"
                className="form-textarea form-input"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Contoh: Mohon dikirim segera, saya ambil di kosan."
              />
            </div>

            <div className={styles.fieldGroup}>
              <p className={styles.fieldLabel}>Metode Pembayaran</p>
              <div className={styles.optionRow}>
                <button
                  type="button"
                  className={`${styles.optionBtn} ${styles.optionActive}`}
                >
                  Transfer Manual
                </button>
                <button
                  type="button"
                  className={styles.optionBtn}
                  disabled
                  title="Akan datang"
                >
                  Midtrans / QRIS
                </button>
                <button
                  type="button"
                  className={styles.optionBtn}
                  disabled
                  title="Akan datang"
                >
                  COD
                </button>
              </div>
            </div>
          </section>

          <aside className={styles.summaryPanel}>
            <div className="card" style={{ padding: '24px' }}>
              <h2>Ringkasan Pesanan</h2>
              <div className={styles.summaryItem}>
                <span>Subtotal Produk</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>
              <div className={styles.summaryItem}>
                <span>Ongkir</span>
                {shippingType === 'DELIVERY'
                  ? <span>{formatPrice(FLAT_SHIPPING_FEE)}</span>
                  : <span className="text-muted">Rp0 (Ambil Sendiri)</span>
                }
              </div>
              <div className={styles.summaryTotal}>
                <span>Estimasi Total</span>
                <strong>{formatPrice(estimatedTotal)}</strong>
              </div>
              {shippingType === 'DELIVERY' && (
                <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                  Total final dikonfirmasi setelah pesanan dibuat.
                </p>
              )}

              <div className={styles.helpBox}>
                <p className="font-medium">Pembayaran</p>
                <p className="text-muted">Metode: Transfer Manual ke rekening bank yang disediakan.</p>
              </div>

              <button
                className="btn btn-primary btn-full"
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || loading}
              >
                {loading ? 'Memproses...' : 'Buat Pesanan'}
              </button>
              {successMessage && <p style={{ color: 'var(--color-success)', marginTop: '10px', textAlign: 'center' }}>{successMessage}</p>}
              {errorMessage && <p className="form-error" style={{ marginTop: '10px' }}>{errorMessage}</p>}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
