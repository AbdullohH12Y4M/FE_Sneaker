import { create } from 'zustand';
import { productsApi } from '@/lib/api';

interface FilterPayload {
  category?: string;
  color?: string;
  size?: number;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

interface ShopState {
  products: any[];
  displayProducts: any[];
  categories: string[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  filterProductsLocal: (filters: FilterPayload) => void;
}

export const useShopStore = create<ShopState>((set, get) => ({
  products: [],
  displayProducts: [],
  categories: [],
  isLoading: false,
  error: null,

  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await productsApi.getAll();
      const items = response.data?.items || response.data || [];

      const normalizedProducts = items.map((product: any) => ({
        ...product,
        images: product.imageUrl ? [product.imageUrl] : product.images || ['/placeholder-shoes.png'],
        category: product.category?.name || product.category || 'Uncategorized',
      }));

      const uniqueCategories = Array.from(new Set(normalizedProducts.map((p: any) => p.category).filter(Boolean))) as string[];

      set({
        products: normalizedProducts,
        displayProducts: normalizedProducts,
        categories: uniqueCategories,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        error: err.message || 'Gagal memuat data produk',
        isLoading: false,
      });
    }
  },

  filterProductsLocal: (filters) => {
    const { products } = get();
    const { category, color, size, minPrice, maxPrice, search } = filters;

    const filtered = products.filter((product) => {
      const availableSkus = product.skus ? product.skus.filter((sku: any) => sku.stock > 0) : [];
      if (!availableSkus.length) return false;

      if (category && product.category?.toLowerCase() !== category.toLowerCase()) return false;

      if (search) {
        const searchLower = search.toLowerCase();
        const nameMatch = product.name?.toLowerCase().includes(searchLower);
        const descMatch = product.description?.toLowerCase().includes(searchLower);
        if (!nameMatch && !descMatch) return false;
      }

      if (color && !availableSkus.some((sku: any) => sku.color?.toLowerCase() === color.toLowerCase())) return false;

      if (size && !availableSkus.some((sku: any) => sku.size === size)) return false;

      if (minPrice && !availableSkus.some((sku: any) => (sku.price ?? product.basePrice) >= minPrice)) return false;

      if (maxPrice && maxPrice > 0 && !availableSkus.some((sku: any) => (sku.price ?? product.basePrice) <= maxPrice)) return false;

      return true;
    });

    set({ displayProducts: filtered });
  },
}));

