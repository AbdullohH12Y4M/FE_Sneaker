// ─── User & Auth ────────────────────────────────────────────────────────────
export type UserRole = 'CUSTOMER' | 'ADMIN' | 'STAFF';

export interface User {
  id: string;
  name?: string;
  email: string;
  image?: string;
  role: UserRole;
  createdAt: string;
}

// ─── Brand ──────────────────────────────────────────────────────────────────
export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Category ───────────────────────────────────────────────────────────────
export interface Category {
  description?: string;
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Product & SKU ──────────────────────────────────────────────────────────
export type GenderType = 'MEN' | 'WOMEN' | 'UNISEX' | 'KIDS';

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface ProductSKU {
  id: string;
  productId: string;
  color: string;
  colorHex: string;
  /** EU size — patokan utama */
  sizeEU: number;
  sizeUS?: string;
  sizeUK?: string;
  sizeCM?: number;
  stock: number;
  price?: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  skuCode: string;
  description: string;
  basePrice: number;
  discount?: number;
  gender: GenderType;
  releaseYear?: number;
  isActive: boolean;
  categoryId: string;
  brandId: string;
  /** Dikirim sebagai objek dari API */
  category: { id: string; name: string; slug: string } | string;
  brand: { id: string; name: string; slug: string } | string;
  /**
   * Gambar produk — menyimpan id + url agar admin dapat menghapus per-gambar
   * tanpa perlu fetch ulang hanya untuk mendapatkan imageId.
   * Gunakan images[0]?.url untuk mendapatkan URL gambar utama.
   */
  images: ProductImage[];
  skus: ProductSKU[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductFilters {
  category?: string;
  brand?: string;
  color?: string;
  sizeEU?: number;
  gender?: GenderType;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  page?: number;
  limit?: number;
}

// ─── Cart ────────────────────────────────────────────────────────────────────
export interface CartItem {
  skuId: string;
  productId: string;
  productName: string;
  productSlug: string;
  image: string;
  color: string;
  colorHex: string;
  sizeEU: number;
  price: number;
  quantity: number;
  maxStock: number;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

// ─── Order ───────────────────────────────────────────────────────────────────
export type OrderStatus =
  | 'PENDING'
  | 'WAITING_CONFIRMATION'
  | 'PAID'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';
export type ShippingType = 'DELIVERY' | 'PICKUP';
export type PaymentMethod = 'MANUAL_TRANSFER' | 'MIDTRANS' | 'COD';

export interface ShippingZone {
  id: string;
  district: string;
  price: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  skuId: string;
  sku: ProductSKU & { product: Product };
  quantity: number;
  priceAtPurchase: number;
}

export interface Order {
  shippingCost: number;
  id: string;
  userId: string;
  user?: User;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  totalPrice: number;
  shippingType: ShippingType;
  shippingAddress?: string;
  shippingDistrict?: string;
  shippingFee: number;
  paymentMethod: PaymentMethod;
  paymentProofUrl?: string;
  paymentExpiresAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── API Responses ───────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Form Types ──────────────────────────────────────────────────────────────
export interface CheckoutForm {
  shippingType: ShippingType;
  address: string;
  district: string;
  notes: string;
  paymentMethod: PaymentMethod;
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}
