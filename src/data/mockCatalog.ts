import type { Category, ProductImage } from '@/types';

/** Kategori dummy — struktur selaras dengan respons BE. */
export const mockCategories: Category[] = [
  {
    id: 'cat-sneakers',
    name: 'Sneakers',
    slug: 'sneakers',
    description: 'Sepatu sneakers untuk kampus dan casual',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'cat-casual',
    name: 'Kasual',
    slug: 'casual',
    description: 'Sepatu kasual nyaman sehari-hari',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'cat-formal',
    name: 'Formal',
    slug: 'formal',
    description: 'Sepatu formal untuk presentasi dan wisuda',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'cat-sandal',
    name: 'Sandal',
    slug: 'sandal',
    description: 'Sandal santai area Malang',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'cat-boots',
    name: 'Boots',
    slug: 'boots',
    description: 'Boots untuk cuaca hujan Malang',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

export type MockProductRecord = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  discount?: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category: Category;
  images: ProductImage[];
  skus: Array<{
    id: string;
    productId: string;
    color: string;
    colorHex: string;
    sizeEU: number;
    sizeUS?: string;
    sizeUK?: string;
    sizeCM?: number;
    stock: number;
    price?: number;
    inventory?: { stock: number };
  }>;
};

function img(label: string, bg = '1a1a24', fg = 'f97316'): string {
  return `https://placehold.co/600x600/${bg}/${fg}?text=${encodeURIComponent(label)}`;
}

/** Wrap a URL into a ProductImage-shaped object for mock data. */
function mockImg(productId: string, label: string, bg = '1a1a24', fg = 'f97316', isPrimary = false): ProductImage {
  return {
    id: `img-${productId}-${label.replace(/\+/g, '-').toLowerCase()}`,
    productId,
    url: img(label, bg, fg),
    isPrimary,
    createdAt: '2025-01-01T00:00:00.000Z',
  };
}

/** Produk dummy lengkap dengan SKU & stok untuk uji checkout/admin. */
export const mockProductCatalog: MockProductRecord[] = [
  {
    id: 'prod-1',
    categoryId: 'cat-sneakers',
    name: 'Sneaker Lokal Malang',
    slug: 'sneaker-lokal-malang',
    description:
      'Sneakers lokal breathable untuk kampus. Cocok untuk jalan di area Malang Raya.',
    basePrice: 249000,
    imageUrl: img('Sneaker+Hitam'),
    isActive: true,
    createdAt: '2025-01-15T08:00:00.000Z',
    updatedAt: '2025-01-15T08:00:00.000Z',
    category: mockCategories[0],
    images: [
      mockImg('prod-1', 'Sneaker+Hitam', '1a1a24', 'f97316', true),
      mockImg('prod-1', 'Sneaker+Putih', 'f8fafc', '111827'),
    ],
    skus: [
      { id: 'sku-1', productId: 'prod-1', color: 'Hitam', colorHex: '#111827', sizeEU: 39, stock: 4, price: 249000 },
      { id: 'sku-2', productId: 'prod-1', color: 'Hitam', colorHex: '#111827', sizeEU: 42, stock: 2, price: 249000 },
      { id: 'sku-3', productId: 'prod-1', color: 'Putih', colorHex: '#f8fafc', sizeEU: 40, stock: 1, price: 249000 },
      { id: 'sku-4', productId: 'prod-1', color: 'Merah', colorHex: '#dc2626', sizeEU: 41, stock: 3, price: 259000 },
    ],
  },
  {
    id: 'prod-2',
    categoryId: 'cat-casual',
    name: 'Sepatu Kasual Campus',
    slug: 'sepatu-kasual-campus',
    description: 'Kasual ringan dengan sol empuk. Netral untuk hangout kampus.',
    basePrice: 199000,
    imageUrl: img('Kasual+Navy', '1e293b', 'ffffff'),
    isActive: true,
    createdAt: '2025-01-16T08:00:00.000Z',
    updatedAt: '2025-01-16T08:00:00.000Z',
    category: mockCategories[1],
    images: [
      mockImg('prod-2', 'Kasual+Navy', '1e293b', 'ffffff', true),
      mockImg('prod-2', 'Kasual+Coklat', '7c4d24', 'ffffff'),
    ],
    skus: [
      { id: 'sku-5', productId: 'prod-2', color: 'Navy', colorHex: '#1e293b', sizeEU: 38, stock: 5, price: 199000 },
      { id: 'sku-6', productId: 'prod-2', color: 'Navy', colorHex: '#1e293b', sizeEU: 40, stock: 2, price: 199000 },
      { id: 'sku-7', productId: 'prod-2', color: 'Coklat', colorHex: '#7c4d24', sizeEU: 42, stock: 6, price: 199000 },
    ],
  },
  {
    id: 'prod-3',
    categoryId: 'cat-formal',
    name: 'Formal Kantor Modern',
    slug: 'formal-kantor-modern',
    description: 'Formal ramping untuk presentasi dan wisuda kampus.',
    basePrice: 329000,
    imageUrl: img('Formal+Hitam'),
    isActive: true,
    createdAt: '2025-01-17T08:00:00.000Z',
    updatedAt: '2025-01-17T08:00:00.000Z',
    category: mockCategories[2],
    images: [
      mockImg('prod-3', 'Formal+Hitam', '1a1a24', 'f97316', true),
      mockImg('prod-3', 'Formal+Abu', '6b7280', 'ffffff'),
    ],
    skus: [
      { id: 'sku-8', productId: 'prod-3', color: 'Hitam', colorHex: '#111827', sizeEU: 42, stock: 2, price: 329000 },
      { id: 'sku-9', productId: 'prod-3', color: 'Abu', colorHex: '#6b7280', sizeEU: 41, stock: 1, price: 329000 },
    ],
  },
  {
    id: 'prod-4',
    categoryId: 'cat-sandal',
    name: 'Sandal Santai Malang',
    slug: 'sandal-santai-malang',
    description: 'Sandal budget-friendly. Flat ongkir Malang Raya.',
    basePrice: 89000,
    imageUrl: img('Sandal+Hitam', '4b5563', 'ffffff'),
    isActive: true,
    createdAt: '2025-01-18T08:00:00.000Z',
    updatedAt: '2025-01-18T08:00:00.000Z',
    category: mockCategories[3],
    images: [
      mockImg('prod-4', 'Sandal+Hitam', '4b5563', 'ffffff', true),
      mockImg('prod-4', 'Sandal+Kuning', 'f59e0b', '111827'),
    ],
    skus: [
      { id: 'sku-10', productId: 'prod-4', color: 'Hitam', colorHex: '#111827', sizeEU: 39, stock: 7, price: 89000 },
      { id: 'sku-11', productId: 'prod-4', color: 'Coklat', colorHex: '#7c4d24', sizeEU: 40, stock: 4, price: 89000 },
    ],
  },
  {
    id: 'prod-5',
    categoryId: 'cat-boots',
    name: 'Boots Hujan Malang',
    slug: 'boots-hujan-malang',
    description: 'Boots anti air untuk musim hujan di Malang.',
    basePrice: 279000,
    imageUrl: img('Boots+Hijau', '14532d', 'ffffff'),
    isActive: true,
    createdAt: '2025-01-19T08:00:00.000Z',
    updatedAt: '2025-01-19T08:00:00.000Z',
    category: mockCategories[4],
    images: [mockImg('prod-5', 'Boots+Hijau', '14532d', 'ffffff', true)],
    skus: [
      { id: 'sku-12', productId: 'prod-5', color: 'Hijau', colorHex: '#16a34a', sizeEU: 41, stock: 3, price: 279000 },
      { id: 'sku-13', productId: 'prod-5', color: 'Hitam', colorHex: '#111827', sizeEU: 43, stock: 2, price: 279000 },
    ],
  },
  {
    id: 'prod-6',
    categoryId: 'cat-sneakers',
    name: 'Runner Malang Pro',
    slug: 'runner-malang-pro',
    description: 'Running shoes ringan untuk jogging di kawasan Dieng & Tlogomas.',
    basePrice: 319000,
    discount: 10,
    imageUrl: img('Runner+Biru', '1d4ed8', 'ffffff'),
    isActive: true,
    createdAt: '2025-01-20T08:00:00.000Z',
    updatedAt: '2025-01-20T08:00:00.000Z',
    category: mockCategories[0],
    images: [mockImg('prod-6', 'Runner+Biru', '1d4ed8', 'ffffff', true)],
    skus: [
      { id: 'sku-14', productId: 'prod-6', color: 'Biru', colorHex: '#2563eb', sizeEU: 40, stock: 8, price: 319000 },
      { id: 'sku-15', productId: 'prod-6', color: 'Biru', colorHex: '#2563eb', sizeEU: 42, stock: 5, price: 319000 },
    ],
  },
];

/** Kompatibilitas dengan import lama `@/data/mockProducts`. */
export const mockProducts = mockProductCatalog.map((p) => ({
  ...p,
  category: p.category.name.toUpperCase(),
}));
