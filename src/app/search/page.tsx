import Link from 'next/link';
import { FilterSidebar } from '@/components/shop/FilterSidebar';
import { ProductCard } from '@/components/shop/ProductCard';

export default function SearchPage() {
  return (
    <div className="container" style={{ padding: '40px 0' }}>
      <h1>Search</h1>
      <p>Page ini akan menampilkan katalog produk hasil filter.</p>
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ minWidth: 280 }}>
          <FilterSidebar />
        </div>
        <div style={{ flex: 1 }}>
          <p>Implementasi daftar produk filtered menyusul.</p>
          <Link href="/">Kembali ke Catalog (/)</Link>
        </div>
      </div>
    </div>
  );
}

