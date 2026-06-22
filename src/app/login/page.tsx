'use client';

/**
 * Login & Register page.
 *
 * ── Auth flow ──────────────────────────────────────────────────────────────
 * Login (two steps, executed in sequence):
 *   1. POST /api/auth/login  — our custom endpoint that verifies credentials,
 *      then writes HttpOnly access_token + refresh_token cookies. The response
 *      body carries the user object so the UI can greet the user immediately.
 *   2. signIn('credentials') — tells NextAuth to create its own JWT session
 *      (stored in next-auth.session-token cookie). This is what `useSession()`
 *      and the middleware rely on to know the user is logged in.
 *
 * The two steps are intentional: our API routes use the custom JWT cookies for
 * auth (via getAuthUser()), while the UI / middleware uses the NextAuth session.
 * Keeping them in sync on login ensures both systems are aware of the session.
 *
 * Logout is handled in Navbar — see components/layout/Navbar.tsx.
 */

import { useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { extractErrorMessage } from '@/lib/utils';
import styles from './page.module.css';

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Already logged in — show a welcome screen
  if (session) {
    return (
      <div className="container" style={{ padding: '40px 0' }}>
        <div className={styles.loggedIn}>
          <h1>Selamat datang, {session.user?.name}</h1>
          <p>Anda sudah masuk. Lanjutkan belanja atau lihat riwayat pesanan Anda.</p>
          <div className={styles.loggedInActions}>
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

  // ── Login ────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email || !password) {
      setMessage('Email dan password wajib diisi.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Step 1 — Hit our custom login endpoint.
      // This sets HttpOnly access_token + refresh_token cookies on the browser,
      // which are used by all subsequent API calls via getAuthUser() on the server.
      await axios.post(
        '/api/auth/login',
        { email, password },
        { withCredentials: true }
      );

      // Step 2 — Tell NextAuth to create its own session JWT.
      // This populates useSession() and is read by the middleware for route
      // protection. We use redirect:false so we can handle routing ourselves.
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        // NextAuth rejected the credentials (shouldn't happen since step 1
        // passed, but handle gracefully).
        setMessage('Login berhasil di server, namun sesi browser gagal dibuat. Coba lagi.');
        return;
      }

      // Both cookies are now set — navigate to home (or callbackUrl if present)
      const params = new URLSearchParams(window.location.search);
      const callbackUrl = params.get('callbackUrl') ?? '/';
      router.push(callbackUrl);
      router.refresh(); // Force layout re-render so Navbar picks up the session
    } catch (err: unknown) {
      setMessage(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Register ─────────────────────────────────────────────────────────────
  const handleRegister = async () => {
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
      await axios.post(
        '/api/auth/register',
        { email, password, name: name.trim() || undefined },
        { withCredentials: true }
      );

      setMessage('Akun berhasil dibuat. Silakan masuk.');
      // Reset form and switch to login tab
      setEmail('');
      setPassword('');
      setName('');
      setConfirmPassword('');
      setIsRegister(false);
    } catch (err: unknown) {
      setMessage(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '40px 0' }}>
      <div className={styles.loginGrid}>
        <div className={styles.formCard}>
          {/* Tab toggle */}
          <div className={styles.toggleRow}>
            <button
              type="button"
              className={`${styles.toggleBtn} ${!isRegister ? styles.toggleActive : ''}`}
              onClick={() => { setIsRegister(false); setMessage(''); }}
            >
              Masuk
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${isRegister ? styles.toggleActive : ''}`}
              onClick={() => { setIsRegister(true); setMessage(''); }}
            >
              Daftar
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              isRegister ? handleRegister() : handleLogin();
            }}
          >
            {/* Name — register only */}
            {isRegister && (
              <div className={styles.fieldGroup}>
                <label className="form-label" htmlFor="name">
                  Nama Lengkap <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8em' }}>(opsional)</span>
                </label>
                <input
                  id="name"
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Budi Santoso"
                />
              </div>
            )}

            {/* Email */}
            <div className={styles.fieldGroup}>
              <label className="form-label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
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
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
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

              {/* Password strength indicator — register only */}
              {isRegister && password.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                  <div
                    style={{
                      height: '4px',
                      flex: 1,
                      borderRadius: '2px',
                      background:
                        password.length >= 6
                          ? 'var(--color-success)'
                          : 'var(--color-danger)',
                    }}
                  />
                  <div
                    style={{
                      height: '4px',
                      flex: 1,
                      borderRadius: '2px',
                      background:
                        password.length >= 6 &&
                        (password.match(/[0-9]/) || password.match(/[^a-zA-Z0-9]/))
                          ? 'var(--color-success)'
                          : 'var(--color-surface-3)',
                    }}
                  />
                  <div
                    style={{
                      height: '4px',
                      flex: 1,
                      borderRadius: '2px',
                      background:
                        password.length >= 8 &&
                        password.match(/[0-9]/) &&
                        password.match(/[^a-zA-Z0-9]/)
                          ? 'var(--color-success)'
                          : 'var(--color-surface-3)',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Confirm password — register only */}
            {isRegister && (
              <div className={styles.fieldGroup}>
                <label className="form-label" htmlFor="confirmPassword">
                  Konfirmasi Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="confirmPassword"
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
            )}

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
              style={{ marginTop: '16px' }}
            >
              {loading
                ? isRegister
                  ? 'Mendaftarkan...'
                  : 'Masuk...'
                : isRegister
                  ? 'Daftar Akun'
                  : 'Masuk'}
            </button>
          </form>

          <div className={styles.dividerRow}>
            <span className={styles.dividerText}>atau</span>
          </div>

          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl: '/' })}
            className="btn btn-secondary btn-full"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            Masuk dengan Google
          </button>

          {message && (
            <p
              style={{ marginTop: '12px' }}
              className={
                message.toLowerCase().includes('berhasil')
                  ? 'form-text hint'
                  : 'form-error'
              }
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
