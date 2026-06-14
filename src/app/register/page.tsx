'use client';

/**
 * Dedicated register page.
 *
 * This page also exists as a tab inside /login, but is kept here for users
 * who navigate directly to /register.
 *
 * Uses the same flow as the register tab in login/page.tsx:
 *   POST /api/auth/register — creates the account via UserService.register()
 *   Then redirects to /login so the user can sign in.
 */

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { extractErrorMessage } from '@/lib/utils';
import styles from './page.module.css';

export default function RegisterPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Already authenticated — no need to register again
  if (session) {
    return (
      <div className="container" style={{ padding: '40px 0' }}>
        <div className={styles.registerCard}>
          <h1>Anda sudah masuk</h1>
          <p>Anda sudah memiliki akun. Lanjutkan berbelanja atau kelola akun Anda.</p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => router.push('/')}>
              Beranda
            </button>
            <button className="btn btn-secondary" onClick={() => router.push('/orders')}>
              Pesanan Saya
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage('Password dan konfirmasi tidak cocok.');
      return;
    }
    if (password.length < 6) {
      setMessage('Password minimal 6 karakter.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // POST /api/auth/register — public endpoint, no auth cookie needed
      await axios.post(
        '/api/auth/register',
        { email, password, name: name.trim() || undefined },
        { withCredentials: true }
      );

      setMessage('Akun berhasil dibuat. Silakan masuk.');
      setEmail('');
      setName('');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => router.push('/login'), 1500);
    } catch (err: unknown) {
      setMessage(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '40px 0' }}>
      <div className={styles.registerGrid}>
        {/* Register form */}
        <div className={styles.registerCard}>
          <h1>Daftar Akun</h1>
          <p className="text-muted">Buat akun untuk mulai berbelanja di SneakerLocal.</p>

          <form onSubmit={handleRegister}>
            {/* Name */}
            <div className={styles.fieldGroup}>
              <label className="form-label" htmlFor="reg-name">
                Nama Lengkap{' '}
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8em' }}>
                  (opsional)
                </span>
              </label>
              <input
                id="reg-name"
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Budi Santoso"
              />
            </div>

            {/* Email */}
            <div className={styles.fieldGroup}>
              <label className="form-label" htmlFor="reg-email">
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className={styles.fieldGroup}>
              <label className="form-label" htmlFor="reg-password">
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  {showPassword ? 'Sembunyikan' : 'Lihat'}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className={styles.fieldGroup}>
              <label className="form-label" htmlFor="reg-confirm">
                Konfirmasi Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  {showConfirmPassword ? 'Sembunyikan' : 'Lihat'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
              style={{ marginTop: '16px' }}
            >
              {loading ? 'Membuat Akun...' : 'Daftar'}
            </button>
          </form>

          {message && (
            <p
              style={{ marginTop: '12px' }}
              className={
                message.toLowerCase().includes('berhasil')
                  ? 'form-text hint text-success'
                  : 'form-error'
              }
            >
              {message}
            </p>
          )}

          <p className="text-muted" style={{ marginTop: '16px' }}>
            Sudah punya akun?{' '}
            <Link href="/login" className="btn btn-ghost btn-sm">
              Masuk
            </Link>
          </p>
        </div>

        {/* Marketing copy */}
        <div className={styles.registerCard}>
          <h2>Keuntungan Bergabung</h2>
          <ul style={{ display: 'grid', gap: '12px', paddingLeft: '20px' }}>
            <li>Katalog sepatu lokal Malang terlengkap</li>
            <li>Varian warna dan ukuran lengkap</li>
            <li>Stok real-time dan harga transparan</li>
            <li>Ongkir flat ke seluruh Malang Raya</li>
            <li>Pembayaran aman dengan bukti transfer</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
