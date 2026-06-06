import { mockCategories, mockProductCatalog, type MockProductRecord } from '@/data/mockCatalog';
import { mockUsers } from '@/data/mockUsers';

export const STORAGE_KEY = 'sneakerlocal-mock-state';

export type MockBrandRecord = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export const mockBrands: MockBrandRecord[] = [
  {
    id: 'brand-nike',
    name: 'Nike',
    slug: 'nike',
    logoUrl: null,
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'brand-adidas',
    name: 'Adidas',
    slug: 'adidas',
    logoUrl: null,
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'brand-newbalance',
    name: 'New Balance',
    slug: 'new-balance',
    logoUrl: null,
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'brand-puma',
    name: 'Puma',
    slug: 'puma',
    logoUrl: null,
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

export type MockOrderRecord = {
  id: string;
  userId: string;
  status: string;
  shippingType: 'DELIVERY' | 'PICKUP';
  district?: string;
  shippingAddress?: string;
  shippingFee: number;
  subtotal: number;
  total: number;
  paymentMethod: string;
  paymentProofUrl?: string;
  paymentProofUploadedAt?: string;
  paymentExpiresAt: string;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; email: string; name: string };
  items: Array<{
    id: string;
    orderId: string;
    skuId: string;
    quantity: number;
    price: number;
    priceAtPurchase: number;
    sku: MockProductRecord['skus'][0] & { product: MockProductRecord };
  }>;
};

export type MockState = {
  products: MockProductRecord[];
  categories: typeof mockCategories;
  brands: MockBrandRecord[];
  orders: MockOrderRecord[];
  users: typeof mockUsers;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function defaultState(): MockState {
  return {
    products: clone(mockProductCatalog),
    categories: clone(mockCategories),
    brands: clone(mockBrands),
    orders: [],
    users: clone(mockUsers),
  };
}

export function loadMockState(): MockState {
  if (typeof window === 'undefined') return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as MockState;
  return {
    ...defaultState(),
    ...parsed,
    products: parsed.products?.length ? parsed.products : clone(mockProductCatalog),
    categories: parsed.categories?.length ? parsed.categories : clone(mockCategories),
    brands: parsed.brands?.length ? parsed.brands : clone(mockBrands),
    orders: parsed.orders ?? [],
    users: parsed.users?.length ? parsed.users : clone(mockUsers),
  };
  } catch {
    return defaultState();
  }
}

export function saveMockState(state: MockState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetMockState(): MockState {
  const state = defaultState();
  saveMockState(state);
  memoryState = state;
  return state;
}

let memoryState: MockState | null = null;

export function getMockState(): MockState {
  if (!memoryState) memoryState = loadMockState();
  return memoryState;
}

export function setMockState(state: MockState) {
  memoryState = state;
  saveMockState(state);
}

export function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
