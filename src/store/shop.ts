import { create } from 'zustand';
// Sesuaikan dengan API service atau axios instance yang kamu punya
import { productsApi } from '@/lib/api'; 

export const useShopStore = create((set) => ({
  products: [],
  displayProducts: [],
  categories: [],
  isLoading: false,
  error: null,

  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      // Asumsi backend mengembalikan objek dengan key 'items' atau data langsung
      const response = await productsApi.getAll(); 
      const items = response.data?.items || response.data || [];

      // Memastikan normalisasi variabel konsisten (bukan typo normalized vs normalizedProducts)
      let normalizedProducts = items.map((product: any) => ({
        ...product,
        // mapping tambahan jika struktur data backend perlu disesuaikan
      }));

      // Ambil kategori unik secara dinamis jika backend tidak menyediakan endpoint category terpisah
      const uniqueCategories = Array.from(
        new Set(normalizedProducts.map((p: any) => p.category).filter(Boolean))
      );

      set({
        products: normalizedProducts,
        displayProducts: normalizedProducts, // Default display items
        categories: uniqueCategories,
        isLoading: false
      });
    } catch (err: any) {
      set({ 
        error: err.message || 'Gagal memuat data produk', 
        isLoading: false 
      });
    }
  },
}));