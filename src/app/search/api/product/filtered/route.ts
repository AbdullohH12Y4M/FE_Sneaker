import { NextResponse } from 'next/server';
import api from '@/lib/api';

type FilterQuery = {
  category?: string;
  color?: string;
  size?: string;
  minPrice?: string;
  maxPrice?: string;
  search?: string;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = Object.fromEntries(url.searchParams.entries()) as FilterQuery;

  // Mapping query param ke backend filter DTO (backend controller: GET /products)
  // Catatan: struktur DTO belum kita baca. Ini disiapkan agar kamu tinggal menyesuaikan nama field jika berbeda.
  const params: Record<string, any> = {};

  if (q.category) params.category = q.category;
  if (q.color) params.color = q.color;
  if (q.size) params.size = Number(q.size);
  if (q.minPrice) params.minPrice = Number(q.minPrice);
  if (q.maxPrice) params.maxPrice = Number(q.maxPrice);
  if (q.search) params.search = q.search;

  try {
    const res = await api.get('/products', { params });
    return NextResponse.json(res.data);
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? 'Failed to fetch filtered products' }, { status: 500 });
  }
}

