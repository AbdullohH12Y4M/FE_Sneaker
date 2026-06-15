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

// NOTE: Some admin pages import normalizeProduct.
// This keeps normalization logic centralized to avoid TS export errors.
export function normalizeProduct(input: Record<string, unknown>, productId: string): Record<string, unknown> {
  const raw = input ?? {};

  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    slug: String(raw.slug ?? ''),
    skuCode: String(raw.skuCode ?? ''),
    description: String(raw.description ?? ''),
    basePrice: Number(raw.basePrice ?? 0),
    gender: raw.gender ?? 'UNISEX',
    releaseYear: raw.releaseYear ? Number(raw.releaseYear) : undefined,
    isActive: Boolean(raw.isActive ?? true),
    categoryId: String(raw.categoryId ?? ''),
    brandId: String(raw.brandId ?? ''),
    category: raw.category,
    brand: raw.brand,
    images: Array.isArray(raw.images) ? (raw.images as string[]) : [],
    skus: Array.isArray(raw.skus)
      ? (raw.skus as Array<{ [key: string]: unknown }>).map((s) => ({
          id: String((s as { id?: unknown }).id ?? ''),
          productId: String((s as { productId?: unknown }).productId ?? productId),
          color: String((s as { color?: unknown }).color ?? ''),
          colorHex: String((s as { colorHex?: unknown }).colorHex ?? '#888888'),
          sizeEU: Number((s as { sizeEU?: unknown }).sizeEU ?? 0),
          sizeUS: (s as { sizeUS?: unknown }).sizeUS ? String((s as { sizeUS?: unknown }).sizeUS) : undefined,
          sizeUK: (s as { sizeUK?: unknown }).sizeUK ? String((s as { sizeUK?: unknown }).sizeUK) : undefined,
          sizeCM: (s as { sizeCM?: unknown }).sizeCM != null
            ? Number((s as { sizeCM?: unknown }).sizeCM)
            : undefined,
          stock: Number((s as { stock?: unknown }).stock ?? 0),
          price: (s as { price?: unknown }).price != null ? Number((s as { price?: unknown }).price) : undefined,
        }))
      : [],

    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
  };
}



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

