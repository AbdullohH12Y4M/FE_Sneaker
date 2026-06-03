import { create } from 'zustand';
// Sesuaikan dengan API service atau axios instance yang kamu punya
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

  // 1. Ambil semua data produk dari backend secara utuh sekali saja
  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await productsApi.getAll(); 
      const items = response.data?.items || response.data || [];

      // Normalisasi struktur data backend agar kompatibel dengan komponen UI frontend
      const normalizedProducts = items.map((product: any) => ({
        ...product,
        // Backend mengirim imageUrl (string tunggal), komponen UI biasanya membutuhkan array images
        images: product.imageUrl ? [product.imageUrl] : (product.images || ['/placeholder-shoes.png']),
        // Memastikan field category berupa string label yang konsisten
        category: product.category?.name || product.category || 'Uncategorized'
      }));

      // Ambil kategori unik secara dinamis dari data produk yang masuk
      const uniqueCategories = Array.from(
        new Set(normalizedProducts.map((p: any) => p.category).filter(Boolean))
      ) as string[];

      set({
        products: normalizedProducts,
        displayProducts: normalizedProducts, // Default awal menampilkan semua produk
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

  // 2. Aksi Penyaringan Lokal (Client-side filtering) berdasarkan parameter URL
  filterProductsLocal: (filters) => {
    const { products } = get();
    const { category, color, size, minPrice, maxPrice, search } = filters;

    const filtered = products.filter((product) => {
      // Pastikan produk memiliki varian SKU dengan stok yang tersedia
      const availableSkus = product.skus ? product.skus.filter((sku: any) => sku.stock > 0) : [];
      if (!availableSkus.length) return false;

      // Filter berdasarkan Kategori
      if (category && product.category.toLowerCase() !== category.toLowerCase()) return false;

      // Filter berdasarkan Search Pencarian (Nama & Deskripsi)
      if (search) {
        const searchLower = search.toLowerCase();
        const nameMatch = product.name?.toLowerCase().includes(searchLower);
        const descMatch = product.description?.toLowerCase().includes(searchLower);
        if (!nameMatch && !descMatch) return false;
      }

      // Filter berdasarkan Warna Varian SKU
      if (color && !availableSkus.some((sku: any) => sku.color?.toLowerCase() === color.toLowerCase())) return false;

      // Filter berdasarkan Ukuran Varian SKU
      if (size && !availableSkus.some((sku: any) => sku.size === size)) return false;

      // Filter berdasarkan Rentang Harga Minimal
      if (minPrice && !availableSkus.some((sku: any) => (sku.price ?? product.basePrice) >= minPrice)) return false;

      // Filter berdasarkan Rentang Harga Maksimal
      if (maxPrice && maxPrice > 0 && !availableSkus.some((sku: any) => (sku.price ?? product.basePrice) <= maxPrice)) return false;

      return true;
    });

    set({ displayProducts: filtered });
  }
}));