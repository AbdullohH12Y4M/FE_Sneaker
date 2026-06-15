'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  if (status === 'loading') {
    return <div className="container" style={{ padding: '40px 0', textAlign: 'center' }}>Memuat Admin Panel...</div>;
  }

  // Middleware — block STAFF too based on session role only allows ADMIN
  // But middleware uses access_token JWT, admin layout uses NextAuth session
  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'STAFF')) {
    return (
      <div className="container" style={{ padding: '40px 0' }}>
        <div style={{ textAlign: 'center', padding: '40px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-xl)' }}>
          <p>Anda tidak memiliki akses ke halaman ini.</p>
          <button className="btn btn-primary" onClick={() => router.push('/')} style={{ marginTop: '16px' }}>Kembali ke Beranda</button>
        </div>
      </div>
    );
  }

  const tabs = [
    { name: 'Pesanan', path: '/admin' },
    { name: 'Produk', path: '/admin/products' },
    { name: 'Kategori', path: '/admin/categories' },
    { name: 'Brand', path: '/admin/brands' },
    { name: 'Varian SKU', path: '/admin/skus' },
    { name: 'Inventaris', path: '/admin/inventories' },
    { name: 'Pengguna', path: '/admin/users' },
  ];

  const isActiveTab = (tabPath: string) => {
    if (tabPath === '/admin') return pathname === '/admin';
    return pathname.startsWith(tabPath);
  };

  return (
    <div className="container" style={{ padding: '40px 0' }}>
      <div style={{ marginBottom: '24px' }}>
        <p className="sectionLabel">Admin Panel</p>
        <h1 className="sectionTitle">Manajemen Toko</h1>
        <Link href="/" style={{ fontSize: '0.875rem', color: 'var(--color-primary)', marginTop: '8px', display: 'inline-block' }}>
          &larr; Kembali ke Toko
        </Link>
      </div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', borderBottom: '1px solid var(--color-border)', overflowX: 'auto' }}>
        {tabs.map((tab) => {
          const isActive = isActiveTab(tab.path);
          return (
            <Link
              key={tab.path}
              href={tab.path}
              style={{
                padding: '12px 24px',
                whiteSpace: 'nowrap',
                borderBottom: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
                transition: 'all var(--transition-fast)',
              }}
            >
              {tab.name}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
