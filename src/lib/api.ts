import axios from 'axios';
import { isMockApiEnabled } from './mock-api';
import { mockHandlers } from './mock-api/handlers';

/**
 * Axios instance for all API calls.
 *
 * ── Auth strategy ──────────────────────────────────────────────────────────
 * Credentials (access_token, refresh_token) are stored exclusively in HttpOnly
 * cookies set by the server. The browser sends them automatically with every
 * request because of `withCredentials: true`.
 *
 * There is NO localStorage token. The previous interceptors that read/wrote
 * localStorage.access_token have been removed — localStorage is accessible to
 * any JavaScript on the page (XSS risk), whereas HttpOnly cookies are not.
 *
 * On a 401 response the user is redirected to /login so they can re-authenticate.
 * The server's refresh-token logic (in getAuthUser) silently rotates a new
 * access_token when the refresh_token is still valid, so most expirations are
 * transparent to the user.
 */

// Internal Next.js API base URL resolution
const apiBaseUrl =
  typeof window !== 'undefined'
    ? ''
    : (process.env.NEXTAUTH_URL ?? 'http://localhost:3000');

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  // Send HttpOnly cookies on every request automatically
  withCredentials: true,
});

// 401 interceptor — redirect to /login without touching localStorage
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isMockApiEnabled()) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { isMockApiEnabled };

// ─── Products API ─────────────────────────────────────────────────────────────

export const productsApi = {
  /** Paginated list (no SKUs). */
  getAll: (params?: Record<string, unknown>) =>
    isMockApiEnabled()
      ? mockHandlers.listProducts(params)
      : api.get('/api/products', { params }),

  /** All active products WITH skus, brand, images — used for catalog/home. */
  getAllPublic: (params?: Record<string, unknown>) =>
    isMockApiEnabled()
      ? mockHandlers.listProducts({ ...params, limit: 100 })
      : api.get('/api/products/all', { params }),

  /** Alias for getAllPublic — used by home page and admin product list. */
  listCatalog: () =>
    isMockApiEnabled()
      ? mockHandlers.listCatalog()
      : api.get('/api/products/all'),

  /** Get product detail by slug or id. */
  getBySlug: (slug: string) =>
    isMockApiEnabled()
      ? mockHandlers.getProductBySlug(slug)
      : api.get(`/api/products/${slug}`),

  /** Get product by ID (same endpoint, ID is the param). */
  getById: (id: string) =>
    isMockApiEnabled()
      ? mockHandlers.listProducts().then((res) => {
          const items = (res.data as { items?: unknown[] }).items ?? [];
          const found = (items as Array<{ id?: string }>).find((p) => p.id === id);
          if (!found)
            return Promise.reject({ response: { status: 404, data: { message: 'Not found' } } });
          return { ...res, data: found };
        })
      : api.get(`/api/products/${id}`),

  /** Create product (type=PRODUCT) or add SKU (type=SKU). */
  create: (data: {
    type: 'PRODUCT' | 'SKU';
    // Product fields
    categoryId?: string;
    brandId?: string;
    name?: string;
    slug?: string;
    skuCode?: string;
    description?: string;
    basePrice?: number;
    gender?: 'MEN' | 'WOMEN' | 'UNISEX' | 'KIDS';
    releaseYear?: number;
    isActive?: boolean;
    imageUrl?: string;
    // SKU fields
    productId?: string;
    color?: string;
    colorHex?: string;
    sizeEU?: number;
    sizeUS?: string;
    sizeUK?: string;
    sizeCM?: number;
    initialStock?: number;
    price?: number;
  }) =>
    isMockApiEnabled()
      ? mockHandlers.createProduct(data as Record<string, unknown>)
      : api.post('/api/products', data),

  updateProduct: (id: string, data: Record<string, unknown>) =>
    isMockApiEnabled()
      ? mockHandlers.updateProduct(id, data)
      : api.patch(`/api/products/${id}`, data),

  updateSku: (id: string, data: Record<string, unknown>) =>
    isMockApiEnabled()
      ? mockHandlers.updateSku(id, data)
      : api.patch(`/api/skus/${id}`, data),

  deleteSku: (id: string) =>
    isMockApiEnabled()
      ? Promise.resolve({ data: { success: true } })
      : api.delete(`/api/skus/${id}`),

  updateStock: (skuId: string, data: { type: 'STOCK'; stock: number }) =>
    isMockApiEnabled()
      ? mockHandlers.updateStock(skuId, data)
      : api.patch(`/api/inventories/${skuId}`, data),

  uploadImage: (id: string, file: File, isPrimary = false) => {
    if (isMockApiEnabled()) return mockHandlers.uploadProductImage(id);
    const form = new FormData();
    form.append('file', file);
    form.append('isPrimary', String(isPrimary));
    return api.post(`/api/products/${id}/image`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteImage: (productId: string, imageId: string) =>
    api.delete(`/api/products/${productId}/image?imageId=${imageId}`),

  deleteProduct: (id: string) =>
    isMockApiEnabled()
      ? Promise.resolve({ data: { success: true } })
      : api.delete(`/api/products/${id}`),
};

// ─── Categories API ───────────────────────────────────────────────────────────

export const categoriesApi = {
  getAll: (params?: Record<string, unknown>) =>
    isMockApiEnabled()
      ? mockHandlers.listCategories(params)
      : api.get('/api/categories', { params }),

  listAll: (params?: Record<string, unknown>) =>
    isMockApiEnabled()
      ? mockHandlers.listCategories({ ...params, limit: 100 })
      : api.get('/api/categories/all', { params }),

  getOne: (id: string) =>
    isMockApiEnabled() ? mockHandlers.getCategory(id) : api.get(`/api/categories/${id}`),

  create: (data: { name: string; slug: string }) =>
    isMockApiEnabled()
      ? mockHandlers.createCategory(data)
      : api.post('/api/categories', data),

  update: (id: string, data: Record<string, unknown>) =>
    isMockApiEnabled()
      ? mockHandlers.updateCategory(id, data)
      : api.patch(`/api/categories/${id}`, data),

  remove: (id: string) =>
    isMockApiEnabled()
      ? mockHandlers.deleteCategory(id)
      : api.delete(`/api/categories/${id}`),
};

// ─── Brands API ───────────────────────────────────────────────────────────────

export const brandsApi = {
  getAll: (params?: Record<string, unknown>) =>
    isMockApiEnabled()
      ? mockHandlers.listBrands(params)
      : api.get('/api/brands', { params }),

  getOne: (id: string) =>
    isMockApiEnabled()
      ? mockHandlers.getBrand(id)
      : api.get(`/api/brands/${id}`),

  create: (data: { name: string; slug: string; logoUrl?: string }) =>
    isMockApiEnabled()
      ? mockHandlers.createBrand(data)
      : api.post('/api/brands', data),

  update: (id: string, data: Record<string, unknown>) =>
    isMockApiEnabled()
      ? mockHandlers.updateBrand(id, data)
      : api.patch(`/api/brands/${id}`, data),

  remove: (id: string) =>
    isMockApiEnabled()
      ? mockHandlers.deleteBrand(id)
      : api.delete(`/api/brands/${id}`),
};

// ─── Orders API ───────────────────────────────────────────────────────────────

export const ordersApi = {
  checkout: (data: Record<string, unknown>) =>
    isMockApiEnabled() ? mockHandlers.checkout(data) : api.post('/api/checkout', data),

  getMyOrders: (params?: Record<string, unknown>) =>
    isMockApiEnabled()
      ? mockHandlers.listMyOrders(params)
      : api.get('/api/orders', { params }),

  getAllOrders: (params?: Record<string, unknown>) =>
    isMockApiEnabled()
      ? mockHandlers.listAllOrders(params)
      : api.get('/api/orders/admin', { params }),

  getById: (id: string) =>
    isMockApiEnabled() ? mockHandlers.getOrder(id) : api.get(`/api/orders/${id}`),

  uploadProof: (orderId: string, file: File, note?: string) => {
    if (isMockApiEnabled()) return mockHandlers.uploadPaymentProof(orderId);
    const form = new FormData();
    form.append('file', file);
    if (note?.trim()) form.append('note', note.trim());
    return api.post(`/api/orders/${orderId}/payment-proof`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  updateStatus: (id: string, status: string, note?: string) =>
    isMockApiEnabled()
      ? mockHandlers.updateOrderStatus(id, { status })
      : api.patch(`/api/orders/${id}/status`, { status, note }),

  deleteOrder: (id: string) =>
    isMockApiEnabled() ? mockHandlers.deleteOrder(id) : api.delete(`/api/orders/${id}`),

  downloadReceipt: (id: string) =>
    isMockApiEnabled()
      ? mockHandlers.downloadReceipt(id)
      : api.get(`/api/orders/${id}/receipt`, { responseType: 'blob' }),

  exportOrders: (format: 'csv' | 'json', status?: string) =>
    isMockApiEnabled()
      ? mockHandlers.exportOrders(format, status)
      : api.get(`/api/orders/admin/export`, {
          params: { format, status },
          responseType: 'blob',
        }),
};

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  /**
   * Update the current user's profile (name / password change).
   * Auth cookies are sent automatically via withCredentials.
   */
  updateProfile: (data: {
    name?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => api.patch('/api/auth/profile', data),

  /** Admin only — list all users */
  getAllUsers: () =>
    isMockApiEnabled() ? mockHandlers.getAllUsers() : api.get('/api/auth/users'),
};
