import { formatDistanceToNow, format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy', { locale: localeId });
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: localeId });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

// normalizeProduct has been removed from utils.ts.
// Use normalizeProduct from '@/lib/api-helpers' instead — it handles typed Product
// output and both image formats: string[] and [{id, url}].



export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Menunggu Pembayaran',
  WAITING_CONFIRMATION: 'Menunggu Verifikasi Admin',
  PAID: 'Sudah Dibayar',
  SHIPPED: 'Dalam Pengiriman',
  DELIVERED: 'Sudah Diterima',
  CANCELLED: 'Dibatalkan',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: 'badge-warning',
  WAITING_CONFIRMATION: 'badge-info',
  PAID: 'badge-info',
  SHIPPED: 'badge-primary',
  DELIVERED: 'badge-success',
  CANCELLED: 'badge-danger',
};

export const CATEGORY_LABELS: Record<string, string> = {
  SNEAKERS: 'Sneakers',
  CASUAL: 'Kasual',
  FORMAL: 'Formal',
  SANDAL: 'Sandal',
  BOOTS: 'Boots',
};

export const MALANG_DISTRICTS = [
  { id: 'LOWOKWARU', name: 'Lowokwaru' },
  { id: 'KLOJEN', name: 'Klojen' },
  { id: 'BLIMBING', name: 'Blimbing' },
  { id: 'SUKUN', name: 'Sukun' },
  { id: 'KEDUNGKANDANG', name: 'Kedungkandang' },
];

export function extractErrorMessage(error: unknown): string {
  if (!error) return 'Terjadi kesalahan. Coba lagi.';

  if (typeof error === 'string') return error;

  const err = error as {
    response?: { data?: { message?: string | string[] } };
    request?: unknown;
    message?: string;
  };

  if (err.response?.data?.message) {
    const msg = err.response.data.message;
    if (Array.isArray(msg)) return msg.join(', ');
    return msg;
  }

  // Network error — no response from server
  if (err.request && !err.response) {
    return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
  }

  return err.message || 'Terjadi kesalahan. Coba lagi.';
}

