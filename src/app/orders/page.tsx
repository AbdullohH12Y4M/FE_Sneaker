'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ordersApi } from '@/lib/api';
import { downloadOrderReceipt, parseOrdersList } from '@/lib/api-helpers';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, formatPrice, extractErrorMessage } from '@/lib/utils';
import type { Order, OrderItem } from '@/types';
import styles from './page.module.css';

export default function OrdersPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingOrder, setUploadingOrder] = useState<string | null>(null);
  const [noteByOrderId, setNoteByOrderId] = useState<Record<string, string>>({});
  // Confirmation modal state for cancel action
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  const loadOrders = async () => {
    const response = await ordersApi.getMyOrders();
    const parsed = parseOrdersList(response.data);
    setOrders(parsed);
  };

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        await loadOrders();
        setError('');
      } catch (err: unknown) {
        setError(extractErrorMessage(err));
        setOrders([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  const handleUpload = async (orderId: string, file: File) => {
    const note = noteByOrderId[orderId] || undefined;
    setUploadingOrder(orderId);
    setError('');
    try {
      await ordersApi.uploadProof(orderId, file, note);
      await loadOrders();
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setUploadingOrder(null);
    }
  };

  if (!session) {
    return (
      <div className="container" style={{ padding: '40px 0' }}>
        <div className={styles.emptyState}>
          <p>Silakan login untuk melihat pesanan Anda.</p>
          <Link href="/login" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
            Masuk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '40px 0' }}>
      <div className={styles.ordersHeader}>
        <div>
          <p className="sectionLabel">Riwayat Pesanan</p>
          <h1 className="sectionTitle">Status pesanan dan bukti pembayaran</h1>
        </div>
      </div>

      {loading ? (
        <div className={styles.emptyState}>
          <p>Memuat pesanan...</p>
        </div>
      ) : error && orders.length === 0 ? (
        <div className={styles.emptyState}>
          <p className="form-error">{error}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Tidak ada pesanan.</p>
          <p>Tambah barang ke keranjang, kemudian lakukan checkout.</p>
        </div>
      ) : (
        <div className={styles.orderList}>
          {error && <p className="form-error" style={{ marginBottom: 16 }}>{error}</p>}
          {orders.map((order) => (
            <section className="card" key={order.id} style={{ padding: '24px' }}>
              <div className={styles.orderHeader}>
                <div>
                  <p className="text-muted">Pesanan #{order.id}</p>
                  <h2>{ORDER_STATUS_LABELS[order.status] ?? order.status}</h2>
                </div>
                <span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>
                  {order.status}
                </span>
              </div>

              <div className={styles.orderGrid}>
                <div>
                  <p className="font-medium">Tipe Pengiriman</p>
                  <p className="text-muted">{order.shippingType}</p>
                </div>
                <div>
                  <p className="font-medium">Lokasi</p>
                  <p className="text-muted">
                    {order.shippingAddress || order.shippingDistrict || 'Pengambilan'}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Total</p>
                  <p className="font-medium">{formatPrice(order.totalPrice)}</p>
                </div>
                <div>
                  <p className="font-medium">Tanggal</p>
                  <p className="text-muted">{new Date(order.createdAt).toLocaleDateString('id-ID')}</p>
                </div>
              </div>

              <div className={styles.itemsHeader}>
                <span>Item</span>
                <span>Jumlah</span>
                <span>Subtotal</span>
              </div>
              {order.items.map((item: OrderItem) => (
                <div className={styles.orderItem} key={item.id}>
                  <div>
                    <p className="font-medium">{item.sku?.product?.name ?? 'Produk'}</p>
<p className="text-muted">
                       {item.sku?.color} • EU {item.sku?.sizeEU}
                     </p>
                  </div>
                  <span>{item.quantity}</span>
                  <span>{formatPrice(item.priceAtPurchase * item.quantity)}</span>
                </div>
              ))}

              {/* Payment proof section — shown for relevant statuses */}
              {(order.status === 'PENDING' || order.status === 'WAITING_CONFIRMATION') && (
                <div className={styles.paymentBox}>
                  {/* Show existing proof thumbnail if already uploaded */}
                  {order.paymentProofUrl && (
                    <div style={{ marginBottom: 12 }}>
                      <p className="font-medium" style={{ marginBottom: 8 }}>Bukti Transfer Terunggah:</p>
                      <a href={order.paymentProofUrl} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={order.paymentProofUrl}
                          alt="Bukti transfer"
                          style={{
                            width: '120px',
                            height: '120px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '2px solid var(--color-border)',
                            display: 'block',
                            marginBottom: 6,
                          }}
                        />
                      </a>
                      <a
                        href={order.paymentProofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                      >
                        Lihat Ukuran Penuh
                      </a>
                    </div>
                  )}

                  {/* Upload / re-upload button */}
                  {!order.paymentProofUrl ? (
                    <>
                      <label className="btn btn-primary btn-sm" htmlFor={`proof-${order.id}`}>
                        {uploadingOrder === order.id ? 'Mengunggah...' : 'Unggah Bukti Transfer'}
                        <input
                          id={`proof-${order.id}`}
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) handleUpload(order.id, file);
                          }}
                        />
                      </label>
                      <div style={{ marginTop: 10 }}>
                        <label className="form-label" htmlFor={`note-${order.id}`}>
                          Catatan Tambahan (Opsional)
                        </label>
                        <textarea
                          id={`note-${order.id}`}
                          className="form-textarea form-input"
                          rows={2}
                          value={noteByOrderId[order.id] ?? ''}
                          onChange={(e) =>
                            setNoteByOrderId((prev) => ({ ...prev, [order.id]: e.target.value }))
                          }
                          placeholder="Transfer via BCA a/n Budi"
                        />
                      </div>
                    </>
                  ) : order.status === 'WAITING_CONFIRMATION' ? (
                    /* Allow re-upload when WAITING_CONFIRMATION */
                    <label className="btn btn-secondary btn-sm" htmlFor={`proof-replace-${order.id}`} style={{ marginTop: 8 }}>
                      {uploadingOrder === order.id ? 'Mengunggah...' : 'Ganti Bukti Transfer'}
                      <input
                        id={`proof-replace-${order.id}`}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) handleUpload(order.id, file);
                        }}
                      />
                    </label>
                  ) : null}

                  {order.status === 'WAITING_CONFIRMATION' && (
                    <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>
                      ⏳ Menunggu verifikasi admin
                    </p>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                <Link href={`/orders/${order.id}`} className="btn btn-ghost btn-sm">
                  Detail Pesanan
                </Link>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={async () => {
                    try {
                      await downloadOrderReceipt(order.id);
                    } catch {
                      alert('Gagal mengunduh struk.');
                    }
                  }}
                >
                  Download Struk
                </button>
                {order.status === 'PENDING' && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => setCancelConfirmId(order.id)}
                  >
                    Batalkan Pesanan
                  </button>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Cancel confirmation modal — replaces window.confirm() */}
      {cancelConfirmId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-modal-title"
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
          }}
          onClick={() => setCancelConfirmId(null)}
        >
          <div
            className="card"
            style={{ padding: '32px', maxWidth: '400px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="cancel-modal-title" style={{ marginBottom: '12px' }}>Batalkan Pesanan?</h3>
            <p className="text-muted" style={{ marginBottom: '24px' }}>
              Pesanan #{cancelConfirmId.slice(-8)} akan dibatalkan. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCancelConfirmId(null)}
              >
                Tidak, Kembali
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={async () => {
                  const id = cancelConfirmId;
                  setCancelConfirmId(null);
                  try {
                    await ordersApi.deleteOrder(id);
                    setOrders((prev) => prev.filter((o) => o.id !== id));
                  } catch (err: unknown) {
                    setError(extractErrorMessage(err));
                  }
                }}
              >
                Ya, Batalkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// 