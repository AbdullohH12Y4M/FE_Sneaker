'use client';

import { useCallback, useEffect, useState } from 'react';
import { brandsApi } from '@/lib/api';
import { extractErrorMessage } from '@/lib/utils';
import type { Brand } from '@/types';

function buildBrandPatch(
  original: { name: string; slug: string; logoUrl: string; isActive: boolean },
  current: { name: string; slug: string; logoUrl: string; isActive: boolean }
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (current.name !== original.name) patch.name = current.name;
  if (current.slug !== original.slug) patch.slug = current.slug;
  if (current.logoUrl !== original.logoUrl) patch.logoUrl = current.logoUrl || null;
  if (current.isActive !== original.isActive) patch.isActive = current.isActive;
  return patch;
}

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<{ name: string; slug: string; logoUrl: string; isActive: boolean } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    logoUrl: '',
    isActive: true,
  });

  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true);
      const response = await brandsApi.getAll();
      const data = response.data as { items?: Brand[] } | Brand[];
      setBrands(Array.isArray(data) ? data : (data as { items?: Brand[] }).items ?? []);
      setError('');
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const resetForm = () => {
    setFormData({ name: '', slug: '', logoUrl: '', isActive: true });
    setOriginalData(null);
    setIsCreating(false);
    setEditingId(null);
  };

  const slugify = (val: string) =>
    val.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const slug = formData.slug || slugify(formData.name);
      await brandsApi.create({ name: formData.name, slug, logoUrl: formData.logoUrl || undefined });
      resetForm();
      fetchBrands();
    } catch (err: unknown) {
      alert('Gagal membuat brand: ' + extractErrorMessage(err));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !originalData) return;

    const patch = buildBrandPatch(originalData, formData);
    if (Object.keys(patch).length === 0) {
      resetForm();
      return;
    }

    try {
      await brandsApi.update(editingId, patch);
      resetForm();
      fetchBrands();
    } catch (err: unknown) {
      alert('Gagal memperbarui brand: ' + extractErrorMessage(err));
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus brand "${name}"? Semua produk terkait akan kehilangan relasi brand.`)) return;
    try {
      await brandsApi.remove(id);
      fetchBrands();
    } catch (err: unknown) {
      alert('Gagal menghapus brand: ' + extractErrorMessage(err));
    }
  };

  const startEdit = (brand: Brand) => {
    const initial = {
      name: brand.name,
      slug: brand.slug,
      logoUrl: brand.logoUrl ?? '',
      isActive: brand.isActive,
    };
    setOriginalData(initial);
    setFormData(initial);
    setEditingId(brand.id);
    setIsCreating(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2>Manajemen Brand</h2>
          <p className="text-muted">Nike, Adidas, New Balance, dll.</p>
        </div>
        {!isCreating && !editingId && (
          <button className="btn btn-primary" onClick={() => setIsCreating(true)}>+ Tambah Brand</button>
        )}
      </div>

      {error && <p className="form-error" style={{ marginBottom: '16px' }}>{error}</p>}

      {(isCreating || editingId) && (
        <form
          onSubmit={editingId ? handleUpdate : handleCreate}
          className="card"
          style={{ padding: '24px', marginBottom: '24px', display: 'grid', gap: '16px', maxWidth: '600px' }}
        >
          <h3>{editingId ? 'Edit Brand' : 'Tambah Brand Baru'}</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="form-label">Nama Brand *</label>
              <input
                className="form-input"
                value={formData.name}
                onChange={(e) => {
                  const v = e.target.value;
                  setFormData((p) => ({ ...p, name: v, slug: p.slug || slugify(v) }));
                }}
                placeholder="Nike"
                required
              />
            </div>
            <div>
              <label className="form-label">Slug *</label>
              <input
                className="form-input"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="nike"
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label">URL Logo (opsional)</label>
            <input
              className="form-input"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              placeholder="https://..."
            />
            {formData.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={formData.logoUrl}
                alt="Logo preview"
                style={{ width: '60px', height: '60px', objectFit: 'contain', marginTop: '8px', border: '1px solid var(--color-border)', borderRadius: '6px' }}
              />
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              id="brandIsActive"
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            />
            <label htmlFor="brandIsActive" className="form-label" style={{ margin: 0 }}>Aktif</label>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn btn-primary">{editingId ? 'Perbarui' : 'Buat'}</button>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>Batal</button>
          </div>
        </form>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>Memuat brand...</div>
        ) : brands.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <p>Belum ada brand. Tambahkan brand terlebih dahulu sebelum membuat produk.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Logo</th>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Nama</th>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Slug</th>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Status</th>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Dibuat</th>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => (
                <tr key={brand.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '16px' }}>
                    {brand.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={brand.logoUrl}
                        alt={brand.name}
                        style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                      />
                    ) : (
                      <div style={{ width: '40px', height: '40px', background: 'var(--color-surface-3)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {brand.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '16px', fontWeight: 500 }}>{brand.name}</td>
                  <td style={{ padding: '16px', fontSize: '0.85rem' }}>{brand.slug}</td>
                  <td style={{ padding: '16px' }}>
                    <span className={`badge ${brand.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {brand.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', fontSize: '0.85rem' }}>
                    {new Date(brand.createdAt).toLocaleDateString('id-ID')}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => startEdit(brand)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(brand.id, brand.name)}>Hapus</button>
                    </div>
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
