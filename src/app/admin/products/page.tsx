'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { productsApi, categoriesApi, brandsApi } from '@/lib/api';
import { parseProductsList } from '@/lib/api-helpers';
import { formatPrice, extractErrorMessage } from '@/lib/utils';
import type { Product, Category, Brand } from '@/types';

const GENDER_OPTIONS = [
  { value: 'UNISEX', label: 'Unisex' },
  { value: 'MEN', label: 'Pria' },
  { value: 'WOMEN', label: 'Wanita' },
  { value: 'KIDS', label: 'Anak-anak' },
];

const CURRENT_YEAR = new Date().getFullYear();

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSkuForm, setShowSkuForm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);

  const [productForm, setProductForm] = useState({
    categoryId: '',
    brandId: '',
    name: '',
    slug: '',
    skuCode: '',
    description: '',
    basePrice: '',
    gender: 'UNISEX',
    releaseYear: '',
    isActive: true,
  });

  const [skuForm, setSkuForm] = useState({
    color: '',
    colorHex: '#888888',
    sizeEU: '',
    sizeUS: '',
    sizeUK: '',
    sizeCM: '',
    initialStock: '',
    price: '',
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, brandRes] = await Promise.all([
        productsApi.listCatalog(),
        categoriesApi.listAll(),
        brandsApi.getAll({ isActive: 'true' }),
      ]);

      setProducts(parseProductsList(prodRes.data));

      // categories/all returns { items: [] }
      const catData = catRes.data as { items?: Category[] } | Category[];
      setCategories(Array.isArray(catData) ? catData : (catData as { items?: Category[] }).items ?? []);

      // brands returns { items: [] }
      const brandData = brandRes.data as { items?: Brand[] } | Brand[];
      setBrands(Array.isArray(brandData) ? brandData : (brandData as { items?: Brand[] }).items ?? []);

      setError('');
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const { categoryId, brandId, name, slug, skuCode, description, basePrice } = productForm;
    if (!categoryId || !brandId || !name || !slug || !skuCode || !description || !basePrice) {
      alert('Lengkapi semua field wajib (termasuk Brand dan SKU Code).');
      return;
    }
    setSaving(true);
    try {
      const res = await productsApi.create({
        type: 'PRODUCT',
        categoryId,
        brandId,
        name,
        slug,
        skuCode,
        description,
        basePrice: Number(basePrice),
        gender: productForm.gender as 'MEN' | 'WOMEN' | 'UNISEX' | 'KIDS',
        releaseYear: productForm.releaseYear ? Number(productForm.releaseYear) : undefined,
        isActive: productForm.isActive,
      });

      const newId = (res?.data as { id?: string })?.id;

      // Upload image if provided
      if (newId && productImageFile) {
        await productsApi.uploadImage(newId, productImageFile, true);
      }

      setShowCreateForm(false);
      setProductImageFile(null);
      setProductForm({
        categoryId: '', brandId: '', name: '', slug: '', skuCode: '',
        description: '', basePrice: '', gender: 'UNISEX', releaseYear: '', isActive: true,
      });
      await fetchAll();

      if (newId) router.push(`/admin/products/${newId}/edit`);
    } catch (err: unknown) {
      alert('Gagal membuat produk: ' + extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSku = async (e: React.FormEvent, productId: string) => {
    e.preventDefault();
    if (!skuForm.color || !skuForm.sizeEU || skuForm.initialStock === '') {
      alert('Warna, ukuran EU, dan stok wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      await productsApi.create({
        type: 'SKU',
        productId,
        color: skuForm.color,
        colorHex: skuForm.colorHex,
        sizeEU: Number(skuForm.sizeEU),
        sizeUS: skuForm.sizeUS || undefined,
        sizeUK: skuForm.sizeUK || undefined,
        sizeCM: skuForm.sizeCM ? Number(skuForm.sizeCM) : undefined,
        initialStock: Number(skuForm.initialStock),
        price: skuForm.price ? Number(skuForm.price) : undefined,
      });
      setShowSkuForm(null);
      setSkuForm({ color: '', colorHex: '#888888', sizeEU: '', sizeUS: '', sizeUK: '', sizeCM: '', initialStock: '', price: '' });
      await fetchAll();
    } catch (err: unknown) {
      alert('Gagal membuat SKU: ' + extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Hapus produk "${name}" beserta seluruh varian dan stok?`)) return;
    try {
      await productsApi.deleteProduct(id);
      await fetchAll();
    } catch (err: unknown) {
      alert('Gagal menghapus produk: ' + extractErrorMessage(err));
    }
  };

  const slugify = (val: string) =>
    val.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h2>Manajemen Produk</h2>
        <button
          className="btn btn-primary"
          onClick={() => { setShowCreateForm((v) => !v); setShowSkuForm(null); }}
        >
          {showCreateForm ? 'Batal' : '+ Tambah Produk'}
        </button>
      </div>

      {error && <p className="form-error" style={{ marginBottom: '16px' }}>{error}</p>}

      {/* Create Product Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateProduct} className="card" style={{ padding: '24px', marginBottom: '24px', display: 'grid', gap: '16px' }}>
          <h3>Tambah Produk Baru</h3>

          {/* Category + Brand */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="form-label">Kategori *</label>
              <select
                className="form-select"
                value={productForm.categoryId}
                onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                required
              >
                <option value="">-- Pilih Kategori --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Brand *</label>
              <select
                className="form-select"
                value={productForm.brandId}
                onChange={(e) => setProductForm({ ...productForm, brandId: e.target.value })}
                required
              >
                <option value="">-- Pilih Brand --</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Name + Slug */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="form-label">Nama Produk *</label>
              <input
                className="form-input"
                value={productForm.name}
                onChange={(e) => {
                  const v = e.target.value;
                  setProductForm((p) => ({
                    ...p,
                    name: v,
                    slug: p.slug ? p.slug : slugify(v),
                  }));
                }}
                placeholder="Air Jordan 1 Low"
                required
              />
            </div>
            <div>
              <label className="form-label">Slug *</label>
              <input
                className="form-input"
                value={productForm.slug}
                onChange={(e) => setProductForm({ ...productForm, slug: e.target.value })}
                placeholder="air-jordan-1-low"
                required
              />
            </div>
          </div>

          {/* SKU Code */}
          <div>
            <label className="form-label">SKU Code (Kode Pabrik) *</label>
            <input
              className="form-input"
              value={productForm.skuCode}
              onChange={(e) => setProductForm({ ...productForm, skuCode: e.target.value })}
              placeholder="Contoh: 553558-612"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="form-label">Deskripsi *</label>
            <textarea
              className="form-textarea form-input"
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
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
                value={productForm.basePrice}
                onChange={(e) => setProductForm({ ...productForm, basePrice: e.target.value })}
                placeholder="1500000"
                required
              />
            </div>
            <div>
              <label className="form-label">Gender</label>
              <select
                className="form-select"
                value={productForm.gender}
                onChange={(e) => setProductForm({ ...productForm, gender: e.target.value })}
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
                value={productForm.releaseYear}
                onChange={(e) => setProductForm({ ...productForm, releaseYear: e.target.value })}
                placeholder={String(CURRENT_YEAR)}
                min="1970"
                max={CURRENT_YEAR + 2}
              />
            </div>
          </div>

          {/* Image upload */}
          <div>
            <label className="form-label">Upload Gambar Utama (opsional)</label>
            <input
              type="file"
              accept="image/*"
              className="form-input"
              onChange={(e) => setProductImageFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Active */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              id="isActive"
              type="checkbox"
              checked={productForm.isActive}
              onChange={(e) => setProductForm({ ...productForm, isActive: e.target.checked })}
            />
            <label htmlFor="isActive" className="form-label" style={{ margin: 0 }}>Produk Aktif</label>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Produk'}
          </button>
        </form>
      )}

      {/* Product Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>Memuat data produk...</div>
        ) : products.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>Belum ada produk. Klik "+ Tambah Produk" untuk mulai.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Produk</th>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Brand / Kategori</th>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>SKU Code</th>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Harga</th>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Varian</th>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <>
                  <tr key={product.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {product.images?.[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                          />
                        )}
                        <div>
                          <p style={{ fontWeight: 500, margin: 0 }}>{product.name}</p>
                          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>{product.gender} • {product.releaseYear ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span className="badge badge-info" style={{ marginRight: '4px' }}>
                        {typeof product.brand === 'string' ? product.brand : (product.brand as { name: string })?.name}
                      </span>
                      <span className="badge" style={{ background: 'var(--color-surface-3)' }}>
                        {typeof product.category === 'string' ? product.category : (product.category as { name: string })?.name}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.85rem', fontFamily: 'monospace' }}>{product.skuCode}</td>
                    <td style={{ padding: '16px' }}>{formatPrice(product.basePrice)}</td>
                    <td style={{ padding: '16px' }}>{product.skus?.length || 0} SKU</td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteProduct(product.id, product.name)}
                        >
                          Hapus
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setShowSkuForm(showSkuForm === product.id ? null : product.id)}
                        >
                          + SKU
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Inline SKU Form */}
                  {showSkuForm === product.id && (
                    <tr key={`${product.id}-sku`} style={{ background: 'var(--color-surface-2)' }}>
                      <td colSpan={6} style={{ padding: '24px' }}>
                        <form
                          onSubmit={(e) => handleCreateSku(e, product.id)}
                          className="card"
                          style={{ padding: '20px', display: 'grid', gap: '12px', maxWidth: '700px' }}
                        >
                          <h4>Tambah Varian SKU untuk {product.name}</h4>

                          {/* Color */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'end' }}>
                            <div>
                              <label className="form-label">Warna *</label>
                              <input
                                className="form-input"
                                value={skuForm.color}
                                onChange={(e) => setSkuForm({ ...skuForm, color: e.target.value })}
                                placeholder="Black/White/Gym Red"
                                required
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <input
                                type="color"
                                value={skuForm.colorHex}
                                onChange={(e) => setSkuForm({ ...skuForm, colorHex: e.target.value })}
                                style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer' }}
                              />
                              <input
                                className="form-input"
                                value={skuForm.colorHex}
                                onChange={(e) => setSkuForm({ ...skuForm, colorHex: e.target.value })}
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
                                value={skuForm.sizeEU}
                                onChange={(e) => setSkuForm({ ...skuForm, sizeEU: e.target.value })}
                                placeholder="42.5"
                                required
                              />
                            </div>
                            <div>
                              <label className="form-label">US</label>
                              <input
                                className="form-input"
                                value={skuForm.sizeUS}
                                onChange={(e) => setSkuForm({ ...skuForm, sizeUS: e.target.value })}
                                placeholder="US 9"
                              />
                            </div>
                            <div>
                              <label className="form-label">UK</label>
                              <input
                                className="form-input"
                                value={skuForm.sizeUK}
                                onChange={(e) => setSkuForm({ ...skuForm, sizeUK: e.target.value })}
                                placeholder="UK 8"
                              />
                            </div>
                            <div>
                              <label className="form-label">CM</label>
                              <input
                                type="number"
                                step="0.5"
                                className="form-input"
                                value={skuForm.sizeCM}
                                onChange={(e) => setSkuForm({ ...skuForm, sizeCM: e.target.value })}
                                placeholder="27"
                              />
                            </div>
                          </div>

                          {/* Stock + Price */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                              <label className="form-label">Stok Awal *</label>
                              <input
                                type="number"
                                className="form-input"
                                value={skuForm.initialStock}
                                onChange={(e) => setSkuForm({ ...skuForm, initialStock: e.target.value })}
                                min="0"
                                placeholder="10"
                                required
                              />
                            </div>
                            <div>
                              <label className="form-label">Harga Override (opsional)</label>
                              <input
                                type="number"
                                className="form-input"
                                value={skuForm.price}
                                onChange={(e) => setSkuForm({ ...skuForm, price: e.target.value })}
                                placeholder="Kosong = pakai base price"
                              />
                            </div>
                          </div>

                          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                            {saving ? 'Menyimpan...' : 'Tambah SKU'}
                          </button>
                        </form>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
