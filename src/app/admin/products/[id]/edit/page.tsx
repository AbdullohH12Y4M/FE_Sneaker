'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { productsApi, categoriesApi, brandsApi } from '@/lib/api';
import { extractErrorMessage, formatPrice } from '@/lib/utils';

import type { Product, ProductImage, ProductSKU, Category, Brand } from '@/types';

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

  // ─── Inline SKU edit state ───────────────────────────────────────────────
  const [editingSkuId, setEditingSkuId] = useState<string | null>(null);
  const [skuEditForm, setSkuEditForm] = useState<{
    color: string; colorHex: string; sizeEU: string;
    sizeUS: string; sizeUK: string; sizeCM: string; price: string; stock: string;
  }>({ color: '', colorHex: '#888888', sizeEU: '', sizeUS: '', sizeUK: '', sizeCM: '', price: '', stock: '' });
  // Snapshot to diff SKU form changes
  const [originalSkuEditForm, setOriginalSkuEditForm] = useState<typeof skuEditForm | null>(null);

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
  // Snapshot of original values to diff against on save
  const [originalFormData, setOriginalFormData] = useState<typeof formData | null>(null);

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
          ? (raw.images as ProductImage[])
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
              stock: Number(
                  (s as unknown as Record<string, unknown>).stock !== undefined
                    ? (s as unknown as Record<string, unknown>).stock
                    : ((s as unknown as Record<string, unknown>).inventory as { stock?: number } | undefined)?.stock ?? 0
                ),
              price: (s as unknown as Record<string, unknown>).price != null ? Number((s as unknown as Record<string, unknown>).price) : undefined,
            }))
          : [],
        createdAt: String(raw.createdAt ?? ''),
        updatedAt: String(raw.updatedAt ?? ''),
      };

      setProduct(found);
      const initial = {
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
      };
      setFormData(initial);
      setOriginalFormData(initial);

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
    if (!productId || !originalFormData) return;
    setSaving(true);
    setError('');
    setSuccess('');

    // Build partial patch — only send changed fields
    const patch: Record<string, unknown> = {};
    if (formData.name !== originalFormData.name) patch.name = formData.name;
    if (formData.slug !== originalFormData.slug) patch.slug = formData.slug;
    if (formData.skuCode !== originalFormData.skuCode) patch.skuCode = formData.skuCode;
    if (formData.description !== originalFormData.description) patch.description = formData.description;
    if (formData.basePrice !== originalFormData.basePrice) patch.basePrice = Number(formData.basePrice);
    if (formData.gender !== originalFormData.gender) patch.gender = formData.gender;
    if (formData.releaseYear !== originalFormData.releaseYear) {
      patch.releaseYear = formData.releaseYear ? Number(formData.releaseYear) : null;
    }
    if (formData.isActive !== originalFormData.isActive) patch.isActive = formData.isActive;
    if (formData.categoryId !== originalFormData.categoryId) patch.categoryId = formData.categoryId || undefined;
    if (formData.brandId !== originalFormData.brandId) patch.brandId = formData.brandId || undefined;

    if (Object.keys(patch).length === 0) {
      setSuccess('Tidak ada perubahan.');
      setSaving(false);
      return;
    }

    try {
      await productsApi.updateProduct(productId, patch);
      setSuccess('Produk berhasil diperbarui.');
      setTimeout(() => setSuccess(''), 4000);
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
      setTimeout(() => setSuccess(''), 4000);
      setImageFile(null);
      await fetchProduct();
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!productId || !confirm('Hapus gambar ini?')) return;
    try {
      setError('');
      await productsApi.deleteImage(productId, imageId);
      await fetchProduct();
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    }
  };

  // ─── Inline SKU handlers ─────────────────────────────────────────────────

  const handleEditSku = (sku: ProductSKU) => {
    const initial = {
      color: sku.color,
      colorHex: sku.colorHex || '#888888',
      sizeEU: String(sku.sizeEU),
      sizeUS: sku.sizeUS ?? '',
      sizeUK: sku.sizeUK ?? '',
      sizeCM: sku.sizeCM ? String(sku.sizeCM) : '',
      price: sku.price ? String(sku.price) : '',
      stock: String(sku.stock),
    };
    setEditingSkuId(sku.id);
    setOriginalSkuEditForm(initial);
    setSkuEditForm(initial);
  };

  const handleSaveSku = async (skuId: string) => {
    if (!originalSkuEditForm) return;
    setSaving(true);
    setError('');

    // Build partial patch for SKU fields (exclude stock — handled separately)
    const skuPatch: Record<string, unknown> = {};
    if (skuEditForm.color !== originalSkuEditForm.color) skuPatch.color = skuEditForm.color;
    if (skuEditForm.colorHex !== originalSkuEditForm.colorHex) skuPatch.colorHex = skuEditForm.colorHex;
    if (skuEditForm.sizeEU !== originalSkuEditForm.sizeEU) skuPatch.sizeEU = Number(skuEditForm.sizeEU);
    if (skuEditForm.sizeUS !== originalSkuEditForm.sizeUS) skuPatch.sizeUS = skuEditForm.sizeUS || undefined;
    if (skuEditForm.sizeUK !== originalSkuEditForm.sizeUK) skuPatch.sizeUK = skuEditForm.sizeUK || undefined;
    if (skuEditForm.sizeCM !== originalSkuEditForm.sizeCM) skuPatch.sizeCM = skuEditForm.sizeCM ? Number(skuEditForm.sizeCM) : undefined;
    if (skuEditForm.price !== originalSkuEditForm.price) skuPatch.price = skuEditForm.price ? Number(skuEditForm.price) : undefined;

    const stockChanged = skuEditForm.stock !== originalSkuEditForm.stock;

    try {
      // Only call updateSku if SKU fields changed
      if (Object.keys(skuPatch).length > 0) {
        await productsApi.updateSku(skuId, skuPatch);
      }
      // Only call updateStock if stock changed
      if (stockChanged) {
        await productsApi.updateStock(skuId, { type: 'STOCK', stock: Number(skuEditForm.stock) });
      }
      setEditingSkuId(null);
      setOriginalSkuEditForm(null);
      if (Object.keys(skuPatch).length > 0 || stockChanged) {
        setSuccess('SKU berhasil diperbarui.');
        setTimeout(() => setSuccess(''), 4000);
        await fetchProduct();
      }
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSku = async (skuId: string) => {
    if (!confirm('Hapus varian SKU ini? Stok akan ikut terhapus.')) return;
    try {
      await productsApi.deleteSku(skuId);
      setSuccess('SKU berhasil dihapus.');
      setTimeout(() => setSuccess(''), 4000);
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
              {product.images.map((img, idx) => (
                <div key={img.id || idx} style={{ position: 'relative' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={`Foto ${idx + 1}`}
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(img.id)}
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
          {uploadingImage && (
            <div className="upload-progress" style={{ marginTop: 12 }}>
              <div className="upload-progress-bar"></div>
            </div>
          )}
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
                    <th style={{ padding: '12px', fontWeight: 600 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {product.skus.map((sku: ProductSKU) => (
                    <>
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
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              type="button"
                              onClick={() => handleEditSku(sku)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              type="button"
                              onClick={() => handleDeleteSku(sku.id)}
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Inline edit row */}
                      {editingSkuId === sku.id && (
                        <tr key={`${sku.id}-edit`} style={{ background: 'var(--color-surface-2)' }}>
                          <td colSpan={7} style={{ padding: '16px' }}>
                            <div className="card" style={{ padding: '16px', display: 'grid', gap: '12px' }}>
                              <h4 style={{ margin: 0 }}>Edit SKU</h4>

                              {/* Color + ColorHex */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'end' }}>
                                <div>
                                  <label className="form-label">Warna *</label>
                                  <input
                                    className="form-input"
                                    value={skuEditForm.color}
                                    onChange={(e) => setSkuEditForm({ ...skuEditForm, color: e.target.value })}
                                  />
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <input
                                    type="color"
                                    value={skuEditForm.colorHex}
                                    onChange={(e) => setSkuEditForm({ ...skuEditForm, colorHex: e.target.value })}
                                    style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer' }}
                                  />
                                  <input
                                    className="form-input"
                                    value={skuEditForm.colorHex}
                                    onChange={(e) => setSkuEditForm({ ...skuEditForm, colorHex: e.target.value })}
                                    style={{ width: '100px' }}
                                  />
                                </div>
                              </div>

                              {/* Sizes */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                                <div>
                                  <label className="form-label">EU *</label>
                                  <input
                                    type="number"
                                    step="0.5"
                                    className="form-input"
                                    value={skuEditForm.sizeEU}
                                    onChange={(e) => setSkuEditForm({ ...skuEditForm, sizeEU: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="form-label">US</label>
                                  <input
                                    className="form-input"
                                    value={skuEditForm.sizeUS}
                                    onChange={(e) => setSkuEditForm({ ...skuEditForm, sizeUS: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="form-label">UK</label>
                                  <input
                                    className="form-input"
                                    value={skuEditForm.sizeUK}
                                    onChange={(e) => setSkuEditForm({ ...skuEditForm, sizeUK: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="form-label">CM</label>
                                  <input
                                    type="number"
                                    step="0.5"
                                    className="form-input"
                                    value={skuEditForm.sizeCM}
                                    onChange={(e) => setSkuEditForm({ ...skuEditForm, sizeCM: e.target.value })}
                                  />
                                </div>
                              </div>

                              {/* Price + Stock */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                  <label className="form-label">Harga Override (Rp)</label>
                                  <input
                                    type="number"
                                    className="form-input"
                                    value={skuEditForm.price}
                                    onChange={(e) => setSkuEditForm({ ...skuEditForm, price: e.target.value })}
                                    placeholder="Kosong = pakai base price"
                                  />
                                </div>
                                <div>
                                  <label className="form-label">Stok *</label>
                                  <input
                                    type="number"
                                    className="form-input"
                                    min="0"
                                    value={skuEditForm.stock}
                                    onChange={(e) => setSkuEditForm({ ...skuEditForm, stock: e.target.value })}
                                  />
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  disabled={saving}
                                  onClick={() => handleSaveSku(sku.id)}
                                >
                                  {saving ? 'Menyimpan...' : 'Simpan SKU'}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => setEditingSkuId(null)}
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
