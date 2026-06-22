'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  FiSearch,
  FiMenu,
  FiX,
  FiLogOut,
  FiSettings,
  FiArchive,
  FiUser,
  FiShoppingBag
} from 'react-icons/fi';
import { useCartStore } from '@/store/cart';
import { productsApi } from '@/lib/api';
import { parseProductsList } from '@/lib/api-helpers';
import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Navbar.module.css';
import type { Product } from '@/types';

// Static home link — categories are fetched dynamically at runtime
const HOME_LINK = { href: '/', label: 'Beranda' };

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const getTotalItems = useCartStore((s) => s.getTotalItems);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const totalItems = getTotalItems();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  // Dynamic categories fetched from API
  const [navCategories, setNavCategories] = useState<{ href: string; label: string }[]>([]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Fetch categories once on mount — graceful degradation on failure
  useEffect(() => {
    import('@/lib/api').then(({ categoriesApi }) => {
      categoriesApi.getAll()
        .then((res) => {
          const data = res.data?.data ?? res.data?.items ?? res.data ?? [];
          if (Array.isArray(data)) {
            const links = data
              .filter((c: any) => c?.isActive !== false)
              .map((c: any) => ({
                href: `/?category=${String(c.slug ?? c.name ?? '').toUpperCase()}`,
                label: String(c.name ?? c.slug ?? ''),
              }));
            setNavCategories(links);
          }
        })
        .catch(() => {
          // Graceful degradation — no categories shown, no error message
        });
    });
  }, []);

  // Helper: determine if a nav link is active (handles ?category= param correctly)
  const isLinkActive = (href: string) => {
    const url = new URL(href, 'http://x');
    if (url.pathname !== pathname) return false;
    const cat = url.searchParams.get('category');
    if (cat) return searchParams.get('category') === cat;
    // Home link is active only when no category filter is active
    return !searchParams.get('category');
  };

  const fetchSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      // getAllPublic hits /api/products/all — includes images and SKUs
      // parseProductsList normalizes both string[] and [{id,url}] image formats
      const res = await productsApi.getAllPublic({ q: trimmed, limit: 5 });
      const items = parseProductsList(res.data);
      setSearchResults(items);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchSearch]);

  return (
    <header className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.announcementBar}>
        🚀 Gratis Ongkir Area Malang Raya — Lowokwaru, Klojen, Blimbing, Sukun, Kedungkandang
      </div>
      <div className="container">
        <div className={styles.inner}>
          {/* Logo */}
          <Link href="/" className={styles.logo}>
            <span className={styles.logoIcon}>👟</span>
            <span className={styles.logoText}>
              Sneaker<span className={styles.logoAccent}>Local</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className={styles.desktopNav}>
            {/* Home link */}
            <Link
              href="/"
              className={`${styles.navLink} ${isLinkActive('/') ? styles.navLinkActive : ''}`}
            >
              Beranda
            </Link>
            {/* Search link */}
            <Link
              href="/search"
              className={`${styles.navLink} ${isLinkActive('/search') ? styles.navLinkActive : ''}`}
            >
              Produk
            </Link>
            {/* Setting link */}
            <Link
              href="/profile"
              className={`${styles.navLink} ${isLinkActive('/profile') ? styles.navLinkActive : ''}`}
            >
              Pengaturan
            </Link>
          </nav>

          {/* Actions */}
          <div className={styles.actions}>
            {/* Search */}
            <div className={styles.searchContainer}>
              {isSearchOpen ? (
                <div className={styles.searchWrapper}>
                  <input
                    type="text"
                    className={`form-input ${styles.searchInput}`}
                    placeholder="Cari sepatu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }
                    }}
                    autoFocus
                  />
                  <button className={styles.searchClose} onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}>
                    <FiX size={18} />
                  </button>
                  {searchQuery && (
                    <div className={styles.searchResults}>
                      {searching ? (
                        <div className={styles.searchEmpty}>Mencari...</div>
                      ) : searchResults.length > 0 ? (
                        <>
                          {searchResults.map((p) => (
                            <Link key={p.id} href={`/products/${p.slug}`} className={styles.searchItem} onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}>
                              <img src={p.images?.[0]?.url ?? '/placeholder-shoes.png'} alt={p.name} className={styles.searchItemImage} />
                              <div>
                                <div className={styles.searchItemName}>{p.name}</div>
                                <div className={styles.searchItemPrice}>{`Rp${Number(p.basePrice ?? 0).toLocaleString('id-ID')}`}</div>
                              </div>
                            </Link>
                          ))}
                          <Link
                            href={`/search?q=${encodeURIComponent(searchQuery)}`}
                            className={styles.searchItem}
                            style={{ justifyContent: 'center', fontWeight: 500 }}
                            onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                          >
                            Lihat semua hasil untuk &ldquo;{searchQuery}&rdquo;
                          </Link>
                        </>
                      ) : (
                        <div className={styles.searchEmpty}>{`Tidak ada hasil untuk "${searchQuery}"`}</div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <button className="btn btn-ghost btn-icon hide-mobile" onClick={() => setIsSearchOpen(true)} aria-label="Cari produk">
                  <FiSearch size={20} />
                </button>
              )}
            </div>

            {/* Cart */}
            <Link href="/cart" className={styles.cartBtn} aria-label="Keranjang belanja">
              <FiShoppingBag size={20} />
              <AnimatePresence>
                {totalItems > 0 && (
                  <motion.span
                    key="cart-badge"
                    className={styles.cartBadge}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  >
                    {totalItems > 9 ? '9+' : totalItems}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            {/* User */}
            {session ? (
              <div className={styles.userMenu}>
                <button
                  className={styles.userBtn}
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-label="Menu pengguna"
                >
                  {session.user?.image ? (
                    <img src={session.user?.image} alt={session.user?.name ?? ''} className={styles.avatar} />
                  ) : (
                    <div className={styles.avatarFallback}>
                      {(session.user?.name ?? 'U')[0].toUpperCase()}
                    </div>
                  )}
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      className={styles.dropdown}
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className={styles.dropdownHeader}>
                        <p className={styles.dropdownName}>{session.user?.name}</p>
                        <p className={styles.dropdownEmail}>{session.user?.email}</p>
                      </div>
                      <hr className="divider" />
                       <Link href="/orders" className={styles.dropdownItem} onClick={() => setUserMenuOpen(false)}>
                         <FiArchive size={16} /> Pesanan Saya
                       </Link>
                       <Link href="/profile" className={styles.dropdownItem} onClick={() => setUserMenuOpen(false)}>
                         <FiUser size={16} /> Profil Saya
                       </Link>
                      {(session.user?.role === 'ADMIN' || session.user?.role === 'STAFF') && (
                        <Link href="/admin" className={styles.dropdownItem} onClick={() => setUserMenuOpen(false)}>
                          <FiSettings size={16} /> Dashboard Admin
                        </Link>
                      )}
                      <hr className="divider" />
                      <button
                        className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                        onClick={async () => {
                          setUserMenuOpen(false);
                          // Step 1: Clear HttpOnly access_token + refresh_token cookies
                          // via our custom logout endpoint. This must happen before
                          // signOut() so the cookies are gone before the page reloads.
                          try {
                            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                          } catch {
                            // Best-effort — even if this fails, we still sign out of NextAuth
                          }
                          // Step 2: Destroy the NextAuth session cookie
                          signOut({ callbackUrl: '/' });
                        }}
                      >
                        <FiLogOut size={16} /> Keluar
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link href="/login" className="btn btn-primary btn-sm hide-mobile">
                <FiUser size={16} /> Masuk
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              className="btn btn-ghost btn-icon hide-desktop"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className={styles.mobileMenu}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className={styles.mobileLinks}>
              {/* Home link */}
              <Link href="/" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>
                Beranda
              </Link>
              {/* Search/Produk link */}
              <Link href="/search" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>
                Produk
              </Link>
              {/* Setting link */}
              <Link href="/profile" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>
                Pengaturan
              </Link>
              {session ? (
                <>
                  <hr className="divider" />
                  <Link href="/orders" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>
                    <FiArchive size={16} /> Pesanan Saya
                  </Link>
                  <Link href="/profile" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>
                    <FiUser size={16} /> Profil Saya
                  </Link>
                  {(session.user?.role === 'ADMIN' || session.user?.role === 'STAFF') && (
                    <Link href="/admin" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>
                      <FiSettings size={16} /> Dashboard Admin
                    </Link>
                  )}
                  <button
                    className={`${styles.mobileLink} ${styles.dropdownItemDanger}`}
                    onClick={async () => {
                      setMobileOpen(false);
                      try {
                        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                      } catch {
                        // Best-effort
                      }
                      signOut({ callbackUrl: '/' });
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                  >
                    <FiLogOut size={16} /> Keluar
                  </button>
                </>
              ) : (
                <Link href="/login" className="btn btn-primary btn-full" style={{ marginTop: 8 }} onClick={() => setMobileOpen(false)}>
                  <FiUser size={16} /> Masuk
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
