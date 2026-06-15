'use client';

import { useCallback, useEffect, useState } from 'react';
import { authApi } from '@/lib/api';
import { extractErrorMessage } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'CUSTOMER' | 'ADMIN' | 'STAFF';
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authApi.getAllUsers();
      const data = response.data as User[];
      setUsers(Array.isArray(data) ? data : []);
      setError('');
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div>
      <h2>Daftar Semua Pengguna</h2>
      <p className="text-muted" style={{ marginBottom: '24px' }}>Total {users.length} pengguna terdaftar.</p>

      {error && <p className="form-error" style={{ marginBottom: '16px' }}>{error}</p>}

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>Memuat data pengguna...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>Tidak ada pengguna.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>ID</th>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Email</th>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Nama</th>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Role</th>
                <th style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Terdaftar</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '16px', fontSize: '0.85rem' }}>...{user.id.substring(user.id.length - 8)}</td>
                  <td style={{ padding: '16px', fontWeight: 500 }}>{user.email}</td>
                  <td style={{ padding: '16px' }}>{user.name ?? <span className="text-muted">-</span>}</td>
                  <td style={{ padding: '16px' }}>
                    <span className={`badge ${user.role === 'ADMIN' ? 'badge-warning' : user.role === 'STAFF' ? 'badge-info' : 'badge-primary'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '16px', fontSize: '0.85rem' }}>{new Date(user.createdAt).toLocaleDateString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
