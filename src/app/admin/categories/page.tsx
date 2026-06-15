'use client';

import { useCallback, useEffect, useState } from 'react';
import { categoriesApi } from '@/lib/api';
import { extractErrorMessage } from '@/lib/utils';
import type { Category } from '@/types';

// Build a partial patch payload — only include fields that changed
function buildCategoryPatch(
  original: Pick<Category, 'name' | 'slug' | 'isActive'> & { description?: string },
  current: { name: string; slug: string; description: string; isActive: boolean }
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (current.name !== original.name) patch.name = current.name;
  if (current.slug !== original.slug) patch.slug = current.slug;
  if (current.description !== (original.description ?? '')) patch.description = current.description;
  if (current.isActive !== original.isActive) patch.isActive = current.isActive;
  return patch;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Store original values so we can diff on save
  const [originalData, setOriginalData] = useState<{ name: string; slug: string; description: string; isActive: boolean } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    isActive: true,
  });


  const fetchCategories = useCallback(async () => {
  try {
    setLoading(true);
    const response = await categoriesApi.listAll();
    const data = response.data as { items?: Category[] } | Category[];
    setCategories(Array.isArray(data) ? data : (data as { items?: Category[] }).items ?? []);
    setError('');
  } catch (err: unknown) {
    setError(extractErrorMessage(err));
  } finally {
    setLoading(false);
  }
}, []);

  // const fetchCategories = useCallback(async () => {
  //   try {
  //     setLoading(true);
  //     const response = await categoriesApi.listAll();
  //     const data = response.data as Category[];
  //     setCategories(Array.isArray(data) ? data : []);
  //     setError('');
  //   } catch (err: unknown) {
  //     setError(extractErrorMessage(err));
  //   } finally {
  //     setLoading(false);
  //   }
  // }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const resetForm = () => {
    setFormData({ name: '', slug: '', description: '', isActive: true });
    setOriginalData(null);
    setIsCreating(false);
    setEditingId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const slug = formData.slug || formData.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await categoriesApi.create({ ...formData, slug });
      resetForm();
      fetchCategories();
    } catch (err: unknown) {
      alert('Gagal membuat kategori: ' + extractErrorMessage(err));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !originalData) return;

    // Only send fields that actually changed
    const patch = buildCategoryPatch(originalData, formData);
    if (Object.keys(patch).length === 0) {
      resetForm();
      return;
    }

    try {
      await categoriesApi.update(editingId, patch);
      resetForm();
      fetchCategories();
    } catch (err: unknown) {
      alert('Gagal memperbarui kategori: ' + extractErrorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus kategori ini?')) return;
    try {
      await categoriesApi.remove(id);
      fetchCategories();
    } catch (err: unknown) {
      alert('Gagal menghapus kategori: ' + extractErrorMessage(err));
    }
  };

  const startEdit = (cat: Category) => {
    const initial = {
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      isActive: cat.isActive,
    };
    setOriginalData(initial);
    setFormData(initial);
    setEditingId(cat.id);
    setIsCreating(false);
  };

  const startCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>Manajemen Kategori</h2>
        {!isCreating && !editingId && (
          <button className="btn btn-primary" onClick={startCreate}>+ Tambah Kategori</button>
        )}
      </div>

      {error && <p className="form-error" style={{ marginBottom: '16px' }}>{error}</p>}

      {(isCreating || editingId) && (
        <form onSubmit={editingId ? handleUpdate : handleCreate} className="card" style={{ padding: '24px', marginBottom: '24px', display: 'grid', gap: '16px' }}>
          <h3>{editingId ? 'Edit Kategori' : 'Tambah Kategori Baru'}</h3>

          <div>
            <label className="form-label">Nama Kategori *</label>
            <input
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Sneakers"
              required
            />
          </div>

          <div>
            <label className="form-label">Slug *</label>
            <input
              className="form-input"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="sneakers"
              required
            />
          </div>

          <div>
            <label className="form-label">Deskripsi</label>
            <textarea
              className="form-textarea form-input"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Deskripsi kategori"
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              id="isActive"
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            />
            <label htmlFor="isActive" className="form-label" style={{ margin: 0 }}>Aktif</label>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn btn-primary">{editingId ? 'Perbarui' : 'Buat'}</button>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>Batal</button>
          </div>
        </form>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>Memuat kategori...</div>
        ) : categories.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>Tidak ada kategori.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Nama</th>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Slug</th>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Status</th>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Dibuat</th>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '16px', fontWeight: 500 }}>{cat.name}</td>
                  <td style={{ padding: '16px', fontSize: '0.85rem' }}>{cat.slug}</td>
                  <td style={{ padding: '16px' }}>
                    <span className={`badge ${cat.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {cat.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', fontSize: '0.85rem' }}>{new Date(cat.createdAt).toLocaleDateString('id-ID')}</td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => startEdit(cat)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(cat.id)}>Hapus</button>
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
