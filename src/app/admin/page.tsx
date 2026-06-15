'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ordersApi } from '@/lib/api';
import { parseOrdersList } from '@/lib/api-helpers';
import { extractErrorMessage, formatPrice, ORDER_STATUS_LABELS } from '@/lib/utils';
import styles from './page.module.css';

import type { Order, OrderStatus } from '@/types';

const ORDER_STATUSES = ['PENDING', 'WAITING_CONFIRMATION', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function AdminPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');

  const fetchOrders = useCallback(async () => {
    const role = session?.user?.role;
    if (!session?.user || !['ADMIN', 'STAFF'].includes(role ?? '')) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await ordersApi.getAllOrders({ limit: 100, status: statusFilter || undefined });
      setOrders(parseOrdersList(response.data));
    } catch (err: any) {
      setError(extractErrorMessage(err));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [session, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    setUpdating(orderId);
    try {
      await ordersApi.updateStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setUpdating(null);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(format);
    try {
      const response = await ordersApi.exportOrders(format, statusFilter || undefined);
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: format === 'csv' ? 'text/csv' : 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `riwayat-transaksi.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setExporting(null);
    }
  };

  if (!session || !['ADMIN', 'STAFF'].includes(session.user?.role ?? '')) {
    return null;
  }

  const totalRevenue = orders
    .filter((o) => o.status === 'PAID' || o.status === 'SHIPPED' || o.status === 'DELIVERED')
    .reduce((sum, o) => sum + o.totalPrice, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h2>Dashboard Admin</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
            style={{ minWidth: '180px' }}
          >
            <option value="">Semua Status</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s] ?? s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <button
            className="btn btn-secondary"
            onClick={() => handleExport('csv')}
            disabled={exporting === 'csv'}
          >
            {exporting === 'csv' ? 'Mengekspor...' : 'Export CSV'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handleExport('json')}
            disabled={exporting === 'json'}
          >
            {exporting === 'json' ? 'Mengekspor...' : 'Export JSON'}
          </button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className="text-muted">Total Pesanan</p>
          <h2>{orders.length}</h2>
        </div>
        <div className={styles.statCard}>
          <p className="text-muted">Menunggu Verifikasi</p>
          <h2>{orders.filter((o) => o.status === 'WAITING_CONFIRMATION').length}</h2>
        </div>
        <div className={styles.statCard}>
          <p className="text-muted">Total Pendapatan</p>
          <h2>{formatPrice(totalRevenue)}</h2>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
          <p className="form-error">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
          <p>Memuat data pesanan...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
          <p>Tidak ada pesanan.</p>
        </div>
      ) : (
        <section className={styles.cardSection}>
          <h2>Perbarui Status Pesanan</h2>
          <div className={styles.orderTable}>
            {orders.map((order) => (
              <div key={order.id} className={styles.orderRow} style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ flex: 1 }}>
                  <p className="font-medium">Pesanan #{order.id}</p>
                  <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '4px' }}>
                    {order.user?.email ?? order.userId} • {ORDER_STATUS_LABELS[order.status] ?? order.status} • {order.items.length} item • {new Date(order.createdAt).toLocaleDateString('id-ID')} • {formatPrice(order.totalPrice)}
                  </p>
                </div>
                <div className={styles.orderActions} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {ORDER_STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`btn btn-sm ${order.status === status ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => handleStatusUpdate(order.id, status as OrderStatus)}
                      disabled={updating === order.id}
                      style={{ minWidth: '100px', whiteSpace: 'nowrap' }}
                    >
                      {updating === order.id ? '...' : ORDER_STATUS_LABELS[status] ?? status.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}