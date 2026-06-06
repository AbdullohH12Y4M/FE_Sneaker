'use client';

import { useEffect, useState } from 'react';
import { productsApi } from '@/lib/api';
import { fetchAdminProductsWithSkus } from '@/lib/api-helpers';
import { formatPrice, extractErrorMessage } from '@/lib/utils';
import type { Product, ProductSKU } from '@/types';
import styles from './page.module.css';

export default function AdminSkusPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingSku, setEditingSku] = useState<{ productId: string; sku: ProductSKU } | null>(null);
  const [formData, setFormData] = useState({
    color: '',
    colorHex: '#888888',
    sizeEU: '',
    sizeUS: '',
    sizeUK: '',
    sizeCM: '',
    price: '',
  });

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

  const resetForm = () => {
    setFormData({ color: '', colorHex: '#888888', sizeEU: '', sizeUS: '', sizeUK: '', sizeCM: '', price: '' });
    setEditingSku(null);
  };

  const handleUpdateSku = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSku) return;
    try {
      await productsApi.updateSku(editingSku.sku.id, {
        color: formData.color,
        colorHex: formData.colorHex,
        sizeEU: Number(formData.sizeEU),
        sizeUS: formData.sizeUS || undefined,
        sizeUK: formData.sizeUK || undefined,
        sizeCM: formData.sizeCM ? Number(formData.sizeCM) : undefined,
        price: formData.price ? Number(formData.price) : undefined,
      });
      resetForm();
      fetchProducts();
    } catch (err: any) {
      alert('Gagal memperbarui SKU: ' + extractErrorMessage(err));
    }
  };

  const startEditSku = (productId: string, sku: ProductSKU) => {
    setEditingSku({ productId, sku });
    setFormData({
      color: sku.color,
      colorHex: sku.colorHex || '#888888',
      sizeEU: String(sku.sizeEU),
      sizeUS: sku.sizeUS ?? '',
      sizeUK: sku.sizeUK ?? '',
      sizeCM: sku.sizeCM != null ? String(sku.sizeCM) : '',
      price: sku.price ? String(sku.price) : '',
    });
  };

  return (
    <div>
      <h2>Manajemen Varian SKU</h2>
      <p className="text-muted" style={{ marginBottom: '24px' }}>Kelola varian warna dan ukuran untuk setiap produk.</p>

      {error && <p className="form-error" style={{ marginBottom: '16px' }}>{error}</p>}

      {editingSku && (
        <form onSubmit={handleUpdateSku} className="card" style={{ padding: '24px', marginBottom: '24px', display: 'grid', gap: '16px', maxWidth: '600px' }}>
          <h3>Edit SKU: {editingSku.sku.color} / EU {editingSku.sku.sizeEU}</h3>
          <p className="text-muted">Produk: {products.find(p => p.id === editingSku.productId)?.name || editingSku.productId}</p>

          <div>
            <label className="form-label">Warna *</label>
            <input
              className="form-input"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              placeholder="Contoh: Hitam"
              required
            />
          </div>

          <div>
            <label className="form-label">Kode Warna (Hex) *</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="color"
                value={formData.colorHex}
                onChange={(e) => setFormData({ ...formData, colorHex: e.target.value })}
                style={{ width: '48px', height: '48px', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-md)' }}
              />
              <input
                className="form-input"
                value={formData.colorHex}
                onChange={(e) => setFormData({ ...formData, colorHex: e.target.value })}
                placeholder="#888888"
                required
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Ukuran EU *</label>
            <input
              type="number"
              step="0.5"
              className="form-input"
              value={formData.sizeEU}
              onChange={(e) => setFormData({ ...formData, sizeEU: e.target.value })}
              placeholder="42.5"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label className="form-label">Ukuran US</label>
              <input className="form-input" value={formData.sizeUS} onChange={(e) => setFormData({ ...formData, sizeUS: e.target.value })} placeholder="US 9" />
            </div>
            <div>
              <label className="form-label">Ukuran UK</label>
              <input className="form-input" value={formData.sizeUK} onChange={(e) => setFormData({ ...formData, sizeUK: e.target.value })} placeholder="UK 8" />
            </div>
            <div>
              <label className="form-label">Ukuran CM</label>
              <input type="number" step="0.5" className="form-input" value={formData.sizeCM} onChange={(e) => setFormData({ ...formData, sizeCM: e.target.value })} placeholder="27" />
            </div>
          </div>

          <div>
            <label className="form-label">Harga (opsional, override base price)</label>
            <input
              type="number"
              className="form-input"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="Kosongkan untuk menggunakan base price"
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn btn-primary">Simpan Perubahan</button>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>Batal</button>
          </div>
        </form>
      )}

      <div style={{ display: 'grid', gap: '24px' }}>
        {loading ? (
          <div className="card" style={{ padding: '24px', textAlign: 'center' }}>Memuat data produk...</div>
        ) : products.length === 0 ? (
          <div className="card" style={{ padding: '24px', textAlign: 'center' }}>Tidak ada produk.</div>
        ) : (
          products.map((product) => (
            <div key={product.id} className="card" style={{ padding: '24px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3>{product.name}</h3>
                  <p className="text-muted" style={{ fontSize: '0.875rem' }}>Base price: {formatPrice(product.basePrice)}</p>
                </div>
                <span className="badge badge-info">{product.skus?.length || 0} varian</span>
              </div>

              {product.skus && product.skus.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                      <th style={{ padding: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Warna</th>
                      <th style={{ padding: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Ukuran</th>
                      <th style={{ padding: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Stok</th>
                      <th style={{ padding: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Harga</th>
                      <th style={{ padding: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.skus.map((sku) => (
                      <tr key={sku.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '12px' }}>
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
                        <td style={{ padding: '12px' }}>EU {sku.sizeEU}{sku.sizeUS ? ` / ${sku.sizeUS}` : ''}</td>
                        <td style={{ padding: '12px' }}>
                          <span className={`badge ${sku.stock > 0 ? 'badge-success' : 'badge-danger'}`}>
                            {sku.stock}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>{formatPrice(sku.price || product.basePrice)}</td>
                        <td style={{ padding: '12px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => startEditSku(product.id, sku)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-muted">Belum ada varian SKU untuk produk ini.</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
