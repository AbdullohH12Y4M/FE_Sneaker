'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { ShoppingBag, User, Search, Menu, X, LogOut, Settings, Package } from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { useState, useEffect } from 'react';
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
            <Link href="/?search=" className="btn btn-ghost btn-icon hide-mobile" aria-label="Cari produk">
              <Search size={20} />
            </Link>

            {/* Cart */}
            <Link href="/cart" className={styles.cartBtn} aria-label="Keranjang belanja">
              <ShoppingBag size={20} />
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
                    // eslint-disable-next-line @next/next/no-img-element
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
                        <Package size={16} /> Pesanan Saya
                      </Link>
                      {session.user?.role === 'ADMIN' && (
                        <Link href="/admin" className={styles.dropdownItem} onClick={() => setUserMenuOpen(false)}>
                          <Settings size={16} /> Dashboard Admin
                        </Link>
                      )}
                      <hr className="divider" />
                      <button
                        className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                        onClick={() => { signOut(); setUserMenuOpen(false); }}
                      >
                        <LogOut size={16} /> Keluar
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link href="/login" className="btn btn-primary btn-sm hide-mobile">
                <User size={16} /> Masuk
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              className="btn btn-ghost btn-icon hide-desktop"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
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
                <Link key={link.href} href={link.href} className={styles.mobileLink}>
                  {link.label}
                </Link>
              ))}
              {!session && (
                <Link href="/login" className="btn btn-primary btn-full" style={{ marginTop: 8 }}>
                  <User size={16} /> Masuk
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
