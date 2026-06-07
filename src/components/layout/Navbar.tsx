'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Navbar.module.css';

const NAV_LINKS = [
  { href: '/', label: 'Beranda' },
  { href: '/?category=SNEAKERS', label: 'Sneakers' },
  { href: '/?category=CASUAL', label: 'Kasual' },
  { href: '/?category=FORMAL', label: 'Formal' },
  { href: '/?category=SANDAL', label: 'Sandal' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const getTotalItems = useCartStore((s) => s.getTotalItems);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const totalItems = getTotalItems();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const fetchSearch = useCallback(async (query: string) => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await productsApi.getAll();
      const all = res.data?.products ?? res.data?.items ?? res.data?.itemsList ?? res.data ?? [];
      const list = Array.isArray(all) ? all : [];
      const matched = list
        .filter((p: any) => {
          const name = String(p.name ?? '').toLowerCase();
          const desc = String(p.description ?? '').toLowerCase();
          return name.includes(trimmed) || desc.includes(trimmed);
        })
        .slice(0, 5);
      setSearchResults(matched);
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
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navLink} ${
                  pathname === link.href ? styles.navLinkActive : ''
                }`}
              >
                {link.label}
              </Link>
            ))}
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
                    autoFocus
                  />
                  <button className={styles.searchClose} onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}>
                    <FiX size={18} />
                  </button>
                  {searchQuery && (
                    <div className={styles.searchResults}>
                      {searchResults.length > 0 ? (
                        searchResults.map((p) => (
                          <Link key={p.id} href={`/products/${p.slug}`} className={styles.searchItem} onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}>
                            <img src={p.images?.[0]} alt={p.name} className={styles.searchItemImage} />
                            <div>
                              <div className={styles.searchItemName}>{p.name}</div>
                              <div className={styles.searchItemPrice}>{`Rp${Number(p.basePrice ?? 0).toLocaleString('id-ID')}`}</div>
                            </div>
                          </Link>
                        ))
                      ) : (
                        <div className={styles.searchEmpty}>{searching ? 'Mencari...' : `Tidak ada hasil untuk "${searchQuery}"`}</div>
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
                      {session.user?.role === 'ADMIN' && (
                        <Link href="/admin" className={styles.dropdownItem} onClick={() => setUserMenuOpen(false)}>
                          <FiSettings size={16} /> Dashboard Admin
                        </Link>
                      )}
                      <hr className="divider" />
                      <button
                        className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                        onClick={() => { localStorage.removeItem('access_token'); signOut({ callbackUrl: '/' }); setUserMenuOpen(false); }}
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
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className={styles.mobileLink} onClick={() => setMobileOpen(false)}>
                  {link.label}
                </Link>
              ))}
              {session ? (
                <>
                  <hr className="divider" />
                  <Link href="/orders" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>
                    <FiArchive size={16} /> Pesanan Saya
                  </Link>
                  <Link href="/profile" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>
                    <FiUser size={16} /> Profil Saya
                  </Link>
                  {session.user?.role === 'ADMIN' && (
                    <Link href="/admin" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>
                      <FiSettings size={16} /> Dashboard Admin
                    </Link>
                  )}
                  <button
                    className={`${styles.mobileLink} ${styles.dropdownItemDanger}`}
                    onClick={() => { localStorage.removeItem('access_token'); signOut({ callbackUrl: '/' }); setMobileOpen(false); }}
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
