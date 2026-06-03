import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import axios from 'axios';
import type { Order, OrderStatus } from '@/types';

interface ShopState {
  products: any[];
  displayProducts: any[]; // State terpisah untuk hasil filter agar tidak loop
  categories: any[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: (filters?: Record<string, any>) => Promise<void>;
}

export const useShopStore = create<ShopState>()(
  persist(
    (set, get) => ({
      products: [],
      displayProducts: [],
      categories: [],
      isLoading: false,
      error: null,

      fetchProducts: async (filters) => {
        // Mencegah trigger loading berulang jika data sudah ada (opsional, untuk performa)
        set({ isLoading: true, error: null });
        try {
          const apiParams: Record<string, any> = { limit: 100 };
          
          if (filters?.search) apiParams.q = filters.search;
          if (filters?.category) apiParams.categorySlug = filters.category.toLowerCase();
          if (filters?.color) apiParams.color = filters.color;
          if (filters?.size) apiParams.size = filters.size;
          if (filters?.minPrice) apiParams.minPrice = filters.minPrice;
          if (filters?.maxPrice) apiParams.maxPrice = filters.maxPrice;

          const response = await productsApi.getAll(apiParams);
          const items = response.data?.items || response.data || [];
          
          // Normalisasi Mismatch Struktur Data Backend -> Frontend
          const normalizedProducts = items.map((product: any) => ({
            ...product,
            // Backend mengirim imageUrl (string tunggal), FE mengharapkan array images
            images: product.imageUrl ? [product.imageUrl] : ['/placeholder-shoes.png'],
            // Backend mengirim objek category atau categoryId, FE mengharapkan string label
            category: product.category?.name || product.category || 'Uncategorized'
          }));

          // Jalankan Filter di Sisi Client (karena endpoint /all mengembalikan semua data)
          if (filters) {
            normalized = normalized.filter((product: any) => {
              if (filters.category && product.category?.slug !== filters.category.toLowerCase()) return false;
              
              if (filters.search) {
                const term = filters.search.toLowerCase();
                const matchName = product.name?.toLowerCase().includes(term);
                const matchDesc = product.description?.toLowerCase().includes(term);
                if (!matchName && !matchDesc) return false;
              }

              if (filters.color) {
                return product.skus.some((s: any) => s.color.toLowerCase() === filters.color.toLowerCase());
              }

              if (filters.size) {
                return product.skus.some((s: any) => s.size === Number(filters.size));
              }

              if (filters.minPrice) {
                return product.skus.some((s: any) => (s.price ?? product.basePrice) >= Number(filters.minPrice));
              }

              if (filters.maxPrice) {
                return product.skus.some((s: any) => (s.price ?? product.basePrice) <= Number(filters.maxPrice));
              }

              return true;
            });
          }

          // Set data ke state. displayProducts digunakan untuk rendering di UI page.
          set({ 
            products: rawProducts, // Simpan data aslinya
            displayProducts: normalized, // Hasil filter aktif
            categories: rawCategories, 
            isLoading: false 
          });
        } catch (err: any) {
          console.error('Fetch error:', err);
          set({ error: 'Gagal mengambil data produk terbaru dari server.', isLoading: false });
        }
      },
    }),
    {
      name: 'sneakerlocal-shop',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ orders: (state as any).orders || [] }),
    }
  )
);
