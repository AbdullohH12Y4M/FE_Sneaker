'use client';

import { useEffect, useState } from 'react';
import { productsApi } from '@/lib/api';
import { fetchAdminProductsWithSkus } from '@/lib/api-helpers';
import { formatPrice, extractErrorMessage } from '@/lib/utils';
import type { Product, ProductSKU } from '@/types';
import styles from './page.module.css';

export default function AdminInventoriesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [stockForm, setStockForm] = useState<{ skuId: string; stock: string } | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const items = await fetchAdminProductsWithSkus();
      setProducts(items);
      setError('');
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockForm) return;
    setUpdating(stockForm.skuId);
    try {
      await productsApi.updateStock(stockForm.skuId, {
        type: 'STOCK',
        stock: Number(stockForm.stock),
      });
      setStockForm(null);
      fetchProducts();
    } catch (err: any) {
      alert('Gagal memperbarui stok: ' + extractErrorMessage(err));
    } finally {
      setUpdating(null);
    }
  };

  const startUpdateStock = (skuId: string, currentStock: number) => {
    setStockForm({ skuId, stock: String(currentStock) });
  };

  const allSkus = products.flatMap((p: Product) =>
    (p.skus || []).map((sku: ProductSKU) => ({
      ...sku,
      productName: p.name,
      productId: p.id,
      basePrice: p.basePrice,
    }))
  );

  return (
    <div>
      <h2>Manajemen Inventaris Stok</h2>
      <p className="text-muted" style={{ marginBottom: '24px' }}>Kelola jumlah stok fisik untuk setiap varian produk.</p>

      {error && <p className="form-error" style={{ marginBottom: '16px' }}>{error}</p>}

      {stockForm && (
        <form onSubmit={handleUpdateStock} className="card" style={{
          padding: '24px',
          marginBottom: '24px',
          display: 'inline-grid',
          gap: '16px',
          maxWidth: '400px',
          border: '2px solid var(--color-primary)',
        }}>
          <h3>Update Stok Inventaris</h3>
          <p className="text-muted">SKU ID: {stockForm.skuId}</p>

          <div>
            <label className="form-label">Jumlah Stok Baru *</label>
            <input
              type="number"
              className="form-input"
              value={stockForm.stock}
              onChange={(e) => setStockForm({ ...stockForm, stock: e.target.value })}
              placeholder="0"
              min="0"
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn btn-primary" disabled={updating === stockForm.skuId}>
              {updating === stockForm.skuId ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setStockForm(null)}>Batal</button>
          </div>
        </form>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>Memuat inventaris...</div>
        ) : allSkus.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>Tidak ada data inventaris.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Produk</th>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Warna</th>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Ukuran</th>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Stok</th>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Harga</th>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {allSkus.map((sku: any) => (
                <tr key={sku.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '16px', fontWeight: 500 }}>{sku.productName}</td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: sku.colorHex || '#888',
                        border: '1px solid var(--color-border)',
                      }} />
                      {sku.color}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>{sku.sizeEU}</td>
                  <td style={{ padding: '16px' }}>
                    <span className={`badge ${sku.stock > 0 ? 'badge-success' : 'badge-danger'}`}>
                      {sku.stock}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>{formatPrice(sku.price || sku.basePrice)}</td>
                  <td style={{ padding: '16px' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => startUpdateStock(sku.id, sku.stock)}
                    >
                      Update Stok
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
