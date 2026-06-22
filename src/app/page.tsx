'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { productsApi } from '@/lib/api';
import { parseProductsList } from '@/lib/api-helpers';
import ProductCard from '@/components/shop/ProductCard';
import type { Product } from '@/types';
import styles from './page.module.css';

// Brands for "Shop By Brand"
const BRANDS = [
  { name: 'Nike', logo: '👟' },
  { name: 'Adidas', logo: '🏃' },
  { name: 'New Balance', logo: '👟' },
  { name: 'Puma', logo: '🐈' },
  { name: 'Converse', logo: '⭐' },
  { name: 'Vans', logo: '🛹' },
  { name: 'Asics', logo: '👟' }
];

// Categories for "Shop By Category"
const CATEGORIES = [
  { name: 'Sneakers', label: 'Sneakers', icon: '👟' },
  { name: 'Kasual', label: 'Casual', icon: '🚶' },
  { name: 'Formal', label: 'Formal', icon: '👞' },
  { name: 'Sandal', label: 'Sandal', icon: '🩴' }
];

// Upcoming Releases (Release Calendar)
const UPCOMING_RELEASES = [
  { id: 1, name: 'Compass Retro Grade Slip-On', date: '25 Juni 2026', price: 'Rp458.000', img: 'https://placehold.co/400x400/12141c/fbbf24?text=Compass' },
  { id: 2, name: 'Patrobas Equiv White Gold', date: '30 Juni 2026', price: 'Rp389.000', img: 'https://placehold.co/400x400/12141c/fbbf24?text=Patrobas' },
  { id: 3, name: 'Ventela Republic Low Black', date: '05 Juli 2026', price: 'Rp350.000', img: 'https://placehold.co/400x400/12141c/fbbf24?text=Ventela' },
  { id: 4, name: 'Geoff Max Maverick Grey', date: '10 Juli 2026', price: 'Rp420.000', img: 'https://placehold.co/400x400/12141c/fbbf24?text=GeoffMax' }
];

// Style Inspiration / Lookbook
const LOOKBOOK_ITEMS = [
  { id: 1, tag: '#LocalStyle', img: 'https://placehold.co/600x800/12141c/fbbf24?text=Look+1', text: 'Styling Ventela Basic dengan Celana Chino & Kaos Polos' },
  { id: 2, tag: '#MalangStreet', img: 'https://placehold.co/600x800/12141c/fbbf24?text=Look+2', text: 'Compass Retro Grade dengan Oversized Hoodie' },
  { id: 3, tag: '#StudentFit', img: 'https://placehold.co/600x800/12141c/fbbf24?text=Look+3', text: 'Gaya kasual santai untuk kuliah pagi yang dingin' }
];

// Customer Reviews / Testimonials
const CUSTOMER_REVIEWS = [
  { id: 1, name: 'Ahmad Rafli', role: 'Mahasiswa UB', rating: 5, text: 'Sepatunya original dan pengirimannya cepat banget ke daerah Dinoyo. Gratis ongkir pula!' },
  { id: 2, name: 'Siti Sarah', role: 'Mahasiswa UM', rating: 5, text: 'Beli Ventela di sini pas banget harganya buat kantong mahasiswa. CS-nya juga ramah pol.' },
  { id: 3, name: 'Kevin Wijaya', role: 'Mahasiswa UMM', rating: 5, text: 'Fitur size filternya ngebantu banget cari sepatu lokal ukuran 44 yang langka. Recommended!' }
];

function HomeContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const response = await productsApi.listCatalog();
        const normalizedProducts = parseProductsList(response.data);
        setProducts(normalizedProducts);
      } catch {
        // Fallback or silent catch
      } finally {
        setIsLoading(false);
      }
    }
    load();

    // Load recently viewed from localStorage
    try {
      const stored = localStorage.getItem('recently_viewed_products');
      if (stored) {
        setRecentlyViewed(JSON.parse(stored).slice(0, 4));
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  // Filter lists dynamically based on catalogs
  const newReleases = useMemo(() => products.slice(0, 4), [products]);
  const trendingSneakers = useMemo(() => [...products].reverse().slice(0, 4), [products]);
  const bestSellers = useMemo(() => products.filter(p => (p.basePrice ?? 0) < 400000).slice(0, 4), [products]);
  const limitedEditions = useMemo(() => products.filter(p => (p.basePrice ?? 0) >= 500000).slice(0, 2), [products]);
  const mostWishlisted = useMemo(() => products.slice(2, 6), [products]);
  const recommendedForYou = useMemo(() => products.slice(1, 5), [products]);

  return (
    <div className={styles.homepage}>
      
      {/* 2. HERO BANNER */}
      <section className={styles.heroSection}>
        <div className={`container ${styles.heroContainer}`}>
          <div className={styles.heroContent}>
            <span className={styles.heroBadge}>🔥 SNEAKERLOCAL SPECIAL EDITION</span>
            <h1 className={styles.heroTitle}>Koleksi Sepatu Lokal Terbaik, Harga Mahasiswa.</h1>
            <p className={styles.heroSubtitle}>
              Dapatkan kenyamanan ekstra untuk kuliah dan nongkrong dengan sneaker brand lokal berkualitas tinggi. Bebas ongkos kirim area Malang Raya!
            </p>
            <div className={styles.heroButtons}>
              <Link href="/search" className="btn btn-primary btn-lg">
                Belanja Sekarang
              </Link>
              <Link href="/search?category=SNEAKERS" className="btn btn-secondary btn-lg">
                Lihat Sneakers
              </Link>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.heroVisualBadge}>Malang Local Pride</div>
            <img 
              src="https://placehold.co/600x500/12141c/fbbf24?text=SneakerLocal+Hero" 
              alt="Exclusive Sneaker" 
              className={styles.heroImage}
            />
          </div>
        </div>
      </section>

      {/* 3. NEW RELEASES */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.tagline}>Fresh Drop</span>
              <h2 className={styles.sectionTitle}>Rilisan Terbaru</h2>
            </div>
            <Link href="/search" className={styles.viewAll}>Lihat Semua &rarr;</Link>
          </div>
          {isLoading ? (
            <div className={styles.skeletonGrid}>
              {[1, 2, 3, 4].map(n => <div key={n} className="skeleton" style={{ height: 350, borderRadius: 'var(--radius-lg)' }} />)}
            </div>
          ) : (
            <div className={styles.productGrid}>
              {newReleases.map((p, idx) => (
                <ProductCard key={p.id} product={p} index={idx} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. TRENDING SNEAKERS */}
      <section className={styles.sectionAlt}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.tagline}>On Fire</span>
              <h2 className={styles.sectionTitle}>Sedang Tren</h2>
            </div>
            <Link href="/search" className={styles.viewAll}>Lihat Semua &rarr;</Link>
          </div>
          {isLoading ? (
            <div className={styles.skeletonGrid}>
              {[1, 2, 3, 4].map(n => <div key={n} className="skeleton" style={{ height: 350, borderRadius: 'var(--radius-lg)' }} />)}
            </div>
          ) : (
            <div className={styles.productGrid}>
              {trendingSneakers.map((p, idx) => (
                <ProductCard key={p.id} product={p} index={idx} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. SHOP BY BRAND */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeaderCentered}>
            <span className={styles.tagline}>Brand Favorit</span>
            <h2 className={styles.sectionTitle}>Beli Berdasarkan Brand</h2>
          </div>
          <div className={styles.brandGrid}>
            {BRANDS.map(brand => (
              <Link 
                key={brand.name} 
                href={`/search?q=${brand.name.toLowerCase()}`} 
                className={styles.brandCard}
              >
                <span className={styles.brandLogo}>{brand.logo}</span>
                <span className={styles.brandName}>{brand.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 6. SHOP BY CATEGORY */}
      <section className={styles.sectionAlt}>
        <div className="container">
          <div className={styles.sectionHeaderCentered}>
            <span className={styles.tagline}>Kategori Pilihan</span>
            <h2 className={styles.sectionTitle}>Pilih Sesuai Gayamu</h2>
          </div>
          <div className={styles.categoryGrid}>
            {CATEGORIES.map(cat => (
              <Link 
                key={cat.name} 
                href={`/search?category=${cat.name.toUpperCase()}`} 
                className={styles.categoryCard}
              >
                <span className={styles.categoryIcon}>{cat.icon}</span>
                <span className={styles.categoryLabel}>{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 7. LIMITED EDITION */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.tagline}>Varian Langka</span>
              <h2 className={styles.sectionTitle}>Edisi Terbatas</h2>
            </div>
          </div>
          {isLoading ? (
            <div className={styles.skeletonGrid} style={{ gridTemplateColumns: '1fr 1fr' }}>
              {[1, 2].map(n => <div key={n} className="skeleton" style={{ height: 280, borderRadius: 'var(--radius-lg)' }} />)}
            </div>
          ) : (
            <div className={styles.limitedGrid}>
              {limitedEditions.length > 0 ? (
                limitedEditions.map((p) => (
                  <div key={p.id} className={styles.limitedCard}>
                    <div className={styles.limitedInfo}>
                      <span className={styles.limitedBadge}>LIMITED DROP</span>
                      <h3 className={styles.limitedTitle}>{p.name}</h3>
                      <p className={styles.limitedDesc}>{p.description || 'Stok sangat terbatas. Segera amankan ukuranmu sekarang!'}</p>
                      <Link href={`/products/${p.slug}`} className="btn btn-primary">
                        Amankan Sekarang
                      </Link>
                    </div>
                    <img 
                      src={p.images?.[0]?.url || 'https://placehold.co/400x400/12141c/fbbf24?text=Limited'} 
                      alt={p.name} 
                      className={styles.limitedImage}
                    />
                  </div>
                ))
              ) : (
                <div className={styles.limitedFallback}>
                  <div className={styles.limitedFallbackCard}>
                    <div className={styles.limitedInfo}>
                      <span className={styles.limitedBadge}>SPECIAL DROP</span>
                      <h3 className={styles.limitedTitle}>Compass Retro Grade Black White</h3>
                      <p className={styles.limitedDesc}>Sepatu Compass edisi retro legendaris. Pasangan kasual yang paling diminati mahasiswa Malang.</p>
                      <Link href="/search" className="btn btn-primary">Lihat Produk</Link>
                    </div>
                    <img src="https://placehold.co/400x400/12141c/fbbf24?text=Compass" alt="Compass" className={styles.limitedImage} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 8. UPCOMING RELEASES */}
      <section className={styles.sectionAlt}>
        <div className="container">
          <div className={styles.sectionHeaderCentered}>
            <span className={styles.tagline}>Kalender Rilis</span>
            <h2 className={styles.sectionTitle}>Rilisan Mendatang</h2>
          </div>
          <div className={styles.upcomingGrid}>
            {UPCOMING_RELEASES.map(item => (
              <div key={item.id} className={styles.upcomingCard}>
                <img src={item.img} alt={item.name} className={styles.upcomingImage} />
                <div className={styles.upcomingDetails}>
                  <span className={styles.upcomingDate}>{item.date}</span>
                  <h3 className={styles.upcomingName}>{item.name}</h3>
                  <div className={styles.upcomingPrice}>{item.price}</div>
                  <button className="btn btn-secondary btn-sm btn-full" style={{ marginTop: '12px' }} onClick={() => alert(`Pengingat diaktifkan untuk ${item.name}!`)}>
                    Ingatkan Saya
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. RECOMMENDED FOR YOU */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.tagline}>Pilihanmu</span>
              <h2 className={styles.sectionTitle}>Direkomendasikan Untuk Anda</h2>
            </div>
          </div>
          {isLoading ? (
            <div className={styles.skeletonGrid}>
              {[1, 2, 3, 4].map(n => <div key={n} className="skeleton" style={{ height: 350, borderRadius: 'var(--radius-lg)' }} />)}
            </div>
          ) : (
            <div className={styles.productGrid}>
              {recommendedForYou.map((p, idx) => (
                <ProductCard key={p.id} product={p} index={idx} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 10. BEST SELLERS */}
      <section className={styles.sectionAlt}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.tagline}>Best Value</span>
              <h2 className={styles.sectionTitle}>Terlaris & Terfavorit</h2>
            </div>
            <Link href="/search" className={styles.viewAll}>Lihat Semua &rarr;</Link>
          </div>
          {isLoading ? (
            <div className={styles.skeletonGrid}>
              {[1, 2, 3, 4].map(n => <div key={n} className="skeleton" style={{ height: 350, borderRadius: 'var(--radius-lg)' }} />)}
            </div>
          ) : (
            <div className={styles.productGrid}>
              {bestSellers.map((p, idx) => (
                <ProductCard key={p.id} product={p} index={idx} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 11. STYLE INSPIRATION (LOOKBOOK) */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeaderCentered}>
            <span className={styles.tagline}>OOTD Lokal</span>
            <h2 className={styles.sectionTitle}>Inspirasi Gaya Mahasiswa</h2>
          </div>
          <div className={styles.lookbookGrid}>
            {LOOKBOOK_ITEMS.map(item => (
              <div key={item.id} className={styles.lookbookCard}>
                <img src={item.img} alt={item.text} className={styles.lookbookImage} />
                <div className={styles.lookbookOverlay}>
                  <span className={styles.lookbookTag}>{item.tag}</span>
                  <p className={styles.lookbookText}>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 12. RECENTLY VIEWED */}
      {recentlyViewed.length > 0 && (
        <section className={styles.sectionAlt}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.tagline}>Terakhir Dilihat</span>
                <h2 className={styles.sectionTitle}>Riwayat Produk Anda</h2>
              </div>
            </div>
            <div className={styles.productGrid}>
              {recentlyViewed.map((p, idx) => (
                <ProductCard key={p.id} product={p} index={idx} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 13. MOST WISHLISTED */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.tagline}>Paling Diincar</span>
              <h2 className={styles.sectionTitle}>Wishlist Terbanyak</h2>
            </div>
          </div>
          {isLoading ? (
            <div className={styles.skeletonGrid}>
              {[1, 2, 3, 4].map(n => <div key={n} className="skeleton" style={{ height: 350, borderRadius: 'var(--radius-lg)' }} />)}
            </div>
          ) : (
            <div className={styles.productGrid}>
              {mostWishlisted.map((p, idx) => (
                <ProductCard key={p.id} product={p} index={idx} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 14. AUTHENTICITY GUARANTEE */}
      <section className={styles.guaranteeSection}>
        <div className="container">
          <div className={styles.guaranteeInner}>
            <div className={styles.guaranteeHeader}>
              <span className={styles.guaranteeBadge}>100% ORIGINAL</span>
              <h2 className={styles.guaranteeTitle}>Jaminan Keaslian & Kualitas Lokal</h2>
              <p className={styles.guaranteeDesc}>
                Kami bekerja sama langsung dengan produsen sepatu lokal terkemuka di Indonesia untuk memastikan setiap produk yang Anda beli 100% original, langsung dari pabrik.
              </p>
            </div>
            <div className={styles.guaranteeGrid}>
              <div className={styles.guaranteeCard}>
                <span className={styles.guaranteeIcon}>🛡️</span>
                <h3>Garansi Uang Kembali</h3>
                <p>Uang kembali 200% jika terbukti sepatu yang Anda terima tidak original.</p>
              </div>
              <div className={styles.guaranteeCard}>
                <span className={styles.guaranteeIcon}>👟</span>
                <h3>Quality Control Ketat</h3>
                <p>Setiap pasang sepatu diperiksa secara manual sebelum dikirim ke kosan Anda.</p>
              </div>
              <div className={styles.guaranteeCard}>
                <span className={styles.guaranteeIcon}>📦</span>
                <h3>Kotak & Kelengkapan Asli</h3>
                <p>Dikirim lengkap dengan box asli, tali cadangan, dan stiker tag resmi.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 15. CUSTOMER REVIEWS */}
      <section className={styles.sectionAlt}>
        <div className="container">
          <div className={styles.sectionHeaderCentered}>
            <span className={styles.tagline}>Testimoni</span>
            <h2 className={styles.sectionTitle}>Kata Mahasiswa Malang</h2>
          </div>
          <div className={styles.reviewsGrid}>
            {CUSTOMER_REVIEWS.map(rev => (
              <div key={rev.id} className={styles.reviewCard}>
                <div className={styles.reviewStars}>
                  {Array.from({ length: rev.rating }).map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                </div>
                <p className={styles.reviewText}>&ldquo;{rev.text}&rdquo;</p>
                <div className={styles.reviewUser}>
                  <strong>{rev.name}</strong>
                  <span>{rev.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 16. SNEAKER NEWS & BLOG */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.tagline}>Kabar Lokal</span>
              <h2 className={styles.sectionTitle}>Sneaker News & Tips</h2>
            </div>
          </div>
          <div className={styles.blogGrid}>
            <div className={styles.blogCard}>
              <img src="https://placehold.co/600x400/12141c/fbbf24?text=Blog+1" alt="Sneakers" className={styles.blogImage} />
              <div className={styles.blogInfo}>
                <span className={styles.blogDate}>22 Juni 2026</span>
                <h3>5 Sepatu Lokal Malang Terbaik untuk Kuliah Sehari-hari</h3>
                <p>Rekomendasi sepatu awet, nyaman, dan ramah kantong mahasiswa baru.</p>
                <Link href="#" className={styles.blogLink}>Baca Selengkapnya</Link>
              </div>
            </div>
            <div className={styles.blogCard}>
              <img src="https://placehold.co/600x400/12141c/fbbf24?text=Blog+2" alt="Sneakers Clean" className={styles.blogImage} />
              <div className={styles.blogInfo}>
                <span className={styles.blogDate}>18 Juni 2026</span>
                <h3>Cara Merawat Sepatu Canvas Saat Musim Hujan di Malang</h3>
                <p>Panduan praktis agar sepatu kesayanganmu tidak berjamur dan tetap wangi.</p>
                <Link href="#" className={styles.blogLink}>Baca Selengkapnya</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 17. NEWSLETTER */}
      <section className={styles.newsletterSection}>
        <div className="container">
          <div className={styles.newsletterInner}>
            <h2>Dapatkan Diskon Khusus Mahasiswa!</h2>
            <p>Masukkan email kampus Anda untuk berlangganan info diskon, restock kilat, dan rilis edisi terbatas.</p>
            <form className={styles.newsletterForm} onSubmit={(e) => { e.preventDefault(); alert('Terima kasih telah berlangganan!'); }}>
              <input 
                type="email" 
                placeholder="Masukkan alamat email Anda" 
                className="form-input" 
                required 
              />
              <button type="submit" className="btn btn-primary">
                Berlangganan
              </button>
            </form>
          </div>
        </div>
      </section>

    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: '40px 0' }}><p className="text-muted">Memuat...</p></div>}>
      <HomeContent />
    </Suspense>
  );
}
