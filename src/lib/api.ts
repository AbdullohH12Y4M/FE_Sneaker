import axios from 'axios';
import { signOut } from 'next-auth/react';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL!;

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor — attach auth token if available
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor — handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        // Bersihkan session NextAuth agar frontend tidak stuck 401 loop
        signOut({ redirect: true, callbackUrl: '/login' });
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── API Functions ─────────────────────────────────────────────────────────

// Products
export const productsApi = {
  // Existing (backend: /products)
  getAll: (params?: Record<string, unknown>) =>
    api.get('/products/all', { params }),

  // Documentation public endpoint (backend: /all)
  // Mengambil semua produk dan kategori aktif tanpa filter.
  getAllPublic: () => api.get('/all'),

  getBySlug: (slug: string) =>
    api.get(`/products/${slug}`),
  // Disesuaikan ke JSON body sesuai spesifikasi backend (termasuk penentuan type 'PRODUCT'/'SKU')
  create: (data: { type: 'PRODUCT' | 'SKU'; categoryId?: string; name?: string; slug?: string; basePrice?: number; color?: string; size?: string; initialStock?: number }) =>
    api.post('/products', data),
  updateProduct: (id: string, data: any) =>
    api.patch(`/products/${id}`, data),
  updateSku: (id: string, data: any) =>
    api.patch(`/skus/${id}`, data),
  updateStock: (skuId: string, data: { type: 'STOCK'; stock: number }) =>
    api.patch(`/inventories/${skuId}`, data),
  uploadImage: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/products/${id}/image`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// Orders
export const ordersApi = {
  checkout: (data: any) => api.post('/checkout', data),
  getMyOrders: (params?: Record<string, unknown>) =>
    api.get('/orders', { params }),
  getById: (id: string) => api.get(`/orders/${id}`),
  uploadProof: (orderId: string, file: File, note?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (note && note.trim().length > 0) {
      form.append('note', note.trim());
    }
    return api.post(`/orders/${orderId}/payment-proof`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  // Admin
  updateStatus: (id: string, status: string) =>
    api.patch(`/orders/${id}/status`, { status }),
};

// Auth
export const authApi = {
  // Disesuaikan dengan endpoint spesifik milik backend SneakerLocal
  registerCustomer: (data: any) => api.post('/auth/register/customer', data),
  registerAdmin: (data: any) => api.post('/auth/register/admin', data),
  login: (data: any) => api.post('/auth/login', data),
};