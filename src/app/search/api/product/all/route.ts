import { NextResponse } from 'next/server';
import api from '@/lib/api';

export async function GET() {
  try {
    const res = await api.get('/products/all');
    return NextResponse.json(res.data);
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? 'Failed to fetch products/all' }, { status: 500 });
  }
}

