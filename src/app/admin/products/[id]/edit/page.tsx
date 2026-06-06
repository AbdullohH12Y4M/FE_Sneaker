'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { productsApi, categoriesApi, brandsApi } from '@/lib/api';
import { extractErrorMessage, formatPrice } from '@/lib/utils';

import type { Product, ProductSKU, Category, Brand } from '@/types';

const GENDER_OPTIONS = [
  { value: 'UNISEX', label: 'Unisex' },
  { value: 'MEN', label: 'Pria' },
  { value: 'WOMEN', label: 'Wanita' },
  { value: 'KIDS', label: 'Anak-anak' },
];

const CURRENT_YEAR = new Date().getFullYear();

export default function AdminProductEditPage() {
  const params = useParams<{ id: string }>();
  const productId = params.id;
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    skuCode: '',
    description: '',
    basePrice: '',
    gender: 'UNISEX',
    releaseYear: '',
    isActive: true,
    categoryId: '',
    brandId: '',
  });

  const fetchProduct = useCallback(async () => {
    if (!productId) return;
    try {
      setLoading(true);
      const [prodRes, catRes, brandRes] = await Promise.all([
        productsApi.getById(productId),
        categoriesApi.listAll(),
        brandsApi.getAll({ isActive: 'true' }),
      ]);

      // normalize product from API response
      const raw = prodRes.data as Record<string, unknown>;
      const found: Product = {
        id: String(raw.id ?? ''),
        name: String(raw.name ?? ''),
        slug: String(raw.slug ?? ''),
        skuCode: String(raw.skuCode ?? ''),
        description: String(raw.description ?? ''),
        basePrice: Number(raw.basePrice ?? 0),
        gender: (raw.gender as Product['gender']) ?? 'UNISEX',
        releaseYear: raw.releaseYear ? Number(raw.releaseYear) : undefined,
        isActive: Boolean(raw.isActive ?? true),
        categoryId: String(raw.categoryId ?? ''),
        brandId: String(raw.brandId ?? ''),
        category: raw.category as Product['category'],
        brand: raw.brand as Product['brand'],
        images: Array.isArray(raw.images)
          ? (raw.images as string[])
          : [],
        skus: Array.isArray(raw.skus)
          ? (raw.skus as ProductSKU[]).map((s) => ({
              id: String((s as unknown as Record<string, unknown>).id ?? ''),
              productId: String((s as unknown as Record<string, unknown>).productId ?? productId),
              color: String((s as unknown as Record<string, unknown>).color ?? ''),
              colorHex: String((s as unknown as Record<string, unknown>).colorHex ?? '#888888'),
              sizeEU: Number((s as unknown as Record<string, unknown>).sizeEU ?? 0),
              sizeUS: (s as unknown as Record<string, unknown>).sizeUS ? String((s as unknown as Record<string, unknown>).sizeUS) : undefined,
              sizeUK: (s as unknown as Record<string, unknown>).sizeUK ? String((s as unknown as Record<string, unknown>).sizeUK) : undefined,
              sizeCM: (s as unknown as Record<string, unknown>).sizeCM != null ? Number((s as unknown as Record<string, unknown>).sizeCM) : undefined,
              stock: Number((s as unknown as Record<string, unknown>).stock ?? 0),
              price: (s as unknown as Record<string, unknown>).price != null ? Number((s as unknown as Record<string, unknown>).price) : undefined,
            }))
          : [],
        createdAt: String(raw.createdAt ?? ''),
        updatedAt: String(raw.updatedAt ?? ''),
      };

      setProduct(found);
      setFormData({
        name: found.name,
        slug: found.slug,
        skuCode: found.skuCode,
        description: found.description,
        basePrice: String(found.basePrice),
        gender: found.gender,
        releaseYear: found.releaseYear ? String(found.releaseYear) : '',
        isActive: found.isActive,
        categoryId: found.categoryId,
        brandId: found.brandId,
      });

      const catData = catRes.data as { items?: Category[] } | Category[];
      setCategories(Array.isArray(catData) ? catData : (catData as { items?: Category[] }).items ?? []);

      const brandData = brandRes.data as { items?: Brand[] } | Brand[];
      setBrands(Array.isArray(brandData) ? brandData : (brandData as { items?: Brand[] }).items ?? []);

      setError('');
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await productsApi.updateProduct(productId, {
        name: formData.name,
        slug: formData.slug,
        skuCode: formData.skuCode,
        description: formData.description,
        basePrice: Number(formData.basePrice),
        gender: formData.gender,
        releaseYear: formData.releaseYear ? Number(formData.releaseYear) : null,
        isActive: formData.isActive,
        categoryId: formData.categoryId || undefined,
        brandId: formData.brandId || undefined,
      });
      setSuccess('Produk berhasil diperbarui.');
      await fetchProduct();
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleUploadImage = async () => {
    if (!productId || !imageFile) return;
    setUploadingImage(true);
    setError('');
    try {
      await productsApi.uploadImage(productId, imageFile, false);
      setSuccess('Gambar produk berhasil diunggah.');
      setImageFile(null);
      await fetchProduct();
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    if (!productId || !confirm('Hapus gambar ini?')) return;
    // Extract imageId — if we don't have it, just refetch after
    // For now we delete by URL via a simple re-fetch approach
    try {
      setError('');
      // The API needs imageId; we need the full images list from raw API
      // Refetch product to get image IDs
      const res = await productsApi.getById(productId);
      const raw = res.data as { images?: { id: string; url: string }[] };
      const img = (raw.images ?? []).find((i) => i.url === imageUrl);
      if (!img) return;
      await productsApi.deleteImage(productId, img.id);
      await fetchProduct();
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p>Memuat data produk...</p>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p className="form-error">{error}</p>
        <button className="btn btn-primary" onClick={() => router.push('/admin/products')} style={{ marginTop: '16px' }}>
          Kembali
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.push('/admin/products')}>
          ← Kembali ke Daftar Produk
        </button>
      </div>

      <div className="card" style={{ padding: '32px', maxWidth: '860px' }}>
        <h2>Edit Produk</h2>
        {product && (
          <p className="text-muted" style={{ marginBottom: '24px', fontSize: '0.875rem' }}>
            ID: {product.id} • Slug: {product.slug} • SKU Code: {product.skuCode} • {product.skus?.length || 0} varian
          </p>
        )}

        {success && <p className="form-text hint text-success" style={{ marginBottom: '16px' }}>{success}</p>}
        {error && <p className="form-error" style={{ marginBottom: '16px' }}>{error}</p>}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '18px' }}>
          {/* Category + Brand */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="form-label">Kategori</label>
              <select
                className="form-select"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              >
                <option value="">-- Pilih Kategori --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Brand</label>
              <select
                className="form-select"
                value={formData.brandId}
                onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
              >
                <option value="">-- Pilih Brand --</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="form-label">Nama Produk *</label>
            <input
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {/* Slug + SKU Code */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="form-label">Slug *</label>
              <input
                className="form-input"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label">SKU Code *</label>
              <input
                className="form-input"
                value={formData.skuCode}
                onChange={(e) => setFormData({ ...formData, skuCode: e.target.value })}
                placeholder="553558-612"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="form-label">Deskripsi *</label>
            <textarea
              className="form-textarea form-input"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              required
            />
          </div>

          {/* Price + Gender + Release Year */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label className="form-label">Harga Dasar (Rp) *</label>
              <input
                type="number"
                className="form-input"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label">Gender</label>
              <select
                className="form-select"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                {GENDER_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Tahun Rilis</label>
              <input
                type="number"
                className="form-input"
                value={formData.releaseYear}
                onChange={(e) => setFormData({ ...formData, releaseYear: e.target.value })}
                placeholder={String(CURRENT_YEAR)}
                min="1970"
                max={CURRENT_YEAR + 2}
              />
            </div>
          </div>

          {/* Active */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              id="isActiveEdit"
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            />
            <label htmlFor="isActiveEdit" className="form-label" style={{ margin: 0 }}>Produk Aktif</label>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => router.push('/admin/products')}>
              Batal
            </button>
          </div>
        </form>

        {/* Images Section */}
        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--color-border)' }}>
          <h3>Foto Produk ({product?.images?.length ?? 0})</h3>

          {/* Current Images */}
          {product?.images && product.images.length > 0 && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', margin: '16px 0' }}>
              {product.images.map((url, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Foto ${idx + 1}`}
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(url)}
                    style={{
                      position: 'absolute', top: '-6px', right: '-6px',
                      background: 'var(--color-danger)', color: '#fff',
                      border: 'none', borderRadius: '50%', width: '20px', height: '20px',
                      cursor: 'pointer', fontSize: '12px', lineHeight: '20px', textAlign: 'center',
                    }}
                  >
                    ×
                  </button>
                  {idx === 0 && (
                    <span style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '10px', padding: '1px 4px', borderRadius: '3px' }}>
                      Utama
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Upload new image */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label className="form-label">Upload Foto Baru</label>
              <input
                type="file"
                accept="image/*"
                className="form-input"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={!imageFile || uploadingImage}
              onClick={handleUploadImage}
            >
              {uploadingImage ? 'Mengunggah...' : 'Unggah Foto'}
            </button>
          </div>
        </div>

        {/* SKUs Table */}
        {product && product.skus && product.skus.length > 0 && (
          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--color-border)' }}>
            <h3>Varian SKU ({product.skus.length})</h3>
            <div style={{ overflowX: 'auto', marginTop: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '12px', fontWeight: 600 }}>Warna</th>
                    <th style={{ padding: '12px', fontWeight: 600 }}>EU</th>
                    <th style={{ padding: '12px', fontWeight: 600 }}>US / UK</th>
                    <th style={{ padding: '12px', fontWeight: 600 }}>CM</th>
                    <th style={{ padding: '12px', fontWeight: 600 }}>Stok</th>
                    <th style={{ padding: '12px', fontWeight: 600 }}>Harga</th>
                  </tr>
                </thead>
                <tbody>
                  {product.skus.map((sku: ProductSKU) => (
                    <tr key={sku.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: sku.colorHex || '#888', border: '1px solid var(--color-border)' }} />
                          {sku.color}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>{sku.sizeEU}</td>
                      <td style={{ padding: '12px', fontSize: '0.85rem' }}>{sku.sizeUS ?? '—'} / {sku.sizeUK ?? '—'}</td>
                      <td style={{ padding: '12px' }}>{sku.sizeCM ?? '—'}</td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge ${sku.stock > 0 ? 'badge-success' : 'badge-danger'}`}>{sku.stock}</span>
                      </td>
                      <td style={{ padding: '12px' }}>{formatPrice(sku.price ?? product.basePrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted" style={{ marginTop: '8px', fontSize: '0.875rem' }}>
              Untuk edit SKU, gunakan menu <strong>Manajemen SKU</strong> di sidebar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
