import { create } from 'zustand';
import { productsApi } from '@/lib/api';
import { parseProductsList } from '@/lib/api-helpers';
import type { Product } from '@/types';

interface FilterPayload {
  category?: string;
  color?: string;
  size?: number;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

interface ShopState {
  products: Product[];
  displayProducts: Product[];
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
      const response = await productsApi.listCatalog();
      const categoriesFromApi =
        response.data && typeof response.data === 'object' && !Array.isArray(response.data)
          ? ((response.data as Record<string, unknown>).categories as unknown[] | undefined) ?? []
          : [];

      const normalizedProducts = parseProductsList(response.data);

      const categoriesNormalized =
        Array.isArray(categoriesFromApi) && categoriesFromApi.length
          ? (categoriesFromApi
              .map((c) => {
                if (typeof c === 'string') return c;
                const obj = c as Record<string, unknown>;
                return (obj?.name ?? obj?.slug) as string | undefined;
              })
              .filter(Boolean) as string[])
          : (Array.from(new Set(normalizedProducts.map((p) => p.category).filter(Boolean))) as string[]);

      const uniqueCategories = Array.from(new Set(categoriesNormalized));

      set({
        products: normalizedProducts,
        displayProducts: normalizedProducts,
        categories: uniqueCategories,
        isLoading: false,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            ?? 'Gagal memuat data produk';
      set({
        error: message,
        isLoading: false,
      });
    }
  },

  filterProductsLocal: (filters) => {
    const { products } = get();
    const { category, color, size, minPrice, maxPrice, search } = filters;

    const filtered = products.filter((product) => {
      const availableSkus = Array.isArray(product.skus)
        ? product.skus.filter((sku) => sku.stock > 0)
        : [];
      if (!availableSkus.length) return false;

      if (category && String(product.category ?? '').toLowerCase() !== category.toLowerCase()) return false;

      if (search) {
        const searchLower = search.toLowerCase();
        const nameMatch = product.name?.toLowerCase().includes(searchLower);
        const descMatch = product.description?.toLowerCase().includes(searchLower);
        if (!nameMatch && !descMatch) return false;
      }

      if (color && !availableSkus.some((sku) => sku.color?.toLowerCase() === color.toLowerCase())) return false;

      if (size && !availableSkus.some((sku) => sku.sizeEU === size)) return false;

      if (minPrice && !availableSkus.some((sku) => (sku.price ?? product.basePrice) >= minPrice)) return false;

      if (maxPrice && maxPrice > 0 && !availableSkus.some((sku) => (sku.price ?? product.basePrice) <= maxPrice)) return false;

      return true;
    });

    set({ displayProducts: filtered });
  },
}));

