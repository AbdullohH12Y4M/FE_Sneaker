'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { extractErrorMessage } from '@/lib/utils';
import styles from './page.module.css';

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) {
      router.push('/login?callbackUrl=/profile');
      return;
    }
    setName((session.user as any)?.name ?? '');
    setEmail((session.user as any)?.email ?? '');
    const saved = localStorage.getItem('profile_image');
    if (saved) setPreview(saved);
  }, [session, router]);

  const triggerUpload = () => fileInputRef.current?.click();

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setSuccess('');

    try {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setPreview(result);
        localStorage.setItem('profile_image', result);
        setSuccess('Foto profil berhasil diperbarui.');
      };
      reader.readAsDataURL(file);
    } catch {
      setError('Gagal memproses foto.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (!session?.user?.email) return;

      if (newPassword || confirmPassword || currentPassword) {
        const trimmedCurrent = currentPassword.trim();
        const trimmedNew = newPassword.trim();
        if (!trimmedCurrent) {
          setError('Masukkan password saat ini.');
          setSaving(false);
          return;
        }
        if (trimmedNew.length < 6) {
          setError('Password baru minimal 6 karakter.');
          setSaving(false);
          return;
        }
        if (trimmedNew !== confirmPassword) {
          setError('Konfirmasi password tidak cocok.');
          setSaving(false);
          return;
        }

        const loginRes = await authApi.login({ email: session.user.email, password: trimmedCurrent });
        const token = loginRes.data?.access_token;
        localStorage.setItem('access_token', token);
      }

      await update({
        ...session,
        user: {
          ...session.user,
          name,
          email,
        },
      } as any);

      setSuccess('Profil berhasil diperbarui.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const displayName = name || session?.user?.name || 'Pengguna';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="container" style={{ padding: '40px 0' }}>
      <div className={styles.profileContainer}>
        <div className={styles.profileHeader}>
          <div className={styles.avatarWrap} onClick={triggerUpload}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadImage}
            />
            {preview ? (
              <img src={preview} alt="Avatar" className={styles.avatarImage} />
            ) : (
              <div className={styles.avatarFallback}>{initials}</div>
            )}
            <span className={styles.avatarBadge}>Ganti Foto</span>
          </div>
          <div>
            <h1 className={styles.name}>{displayName}</h1>
            <p className="text-muted">{email}</p>
            <span className={`badge ${session?.user?.role === 'ADMIN' ? 'badge-warning' : 'badge-info'}`}>
              {session?.user?.role || 'CUSTOMER'}
            </span>
          </div>
        </div>

        <div className={styles.profileBody}>
          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-text hint text-success">{success}</p>}

          <form onSubmit={handleSaveProfile} className="card" style={{ padding: '24px', display: 'grid', gap: '16px' }}>
            <h3>Informasi Profil</h3>
            <div>
              <label className="form-label">Nama</label>
              <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <hr className="divider" />
            <h3>Ubah Password (opsional)</h3>
            <div>
              <label className="form-label">Password Saat Ini</label>
              <input className="form-input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label">Password Baru</label>
                <input className="form-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimal 6 karakter" />
              </div>
              <div>
                <label className="form-label">Konfirmasi Password Baru</label>
                <input className="form-input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ulangi password" />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving} style={{ justifySelf: 'start' }}>
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
