import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/categories/all — public, returns all active categories
export async function GET() {
  try {
    const items = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ items });
  } catch (e) {
    console.error('[categories/all GET]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
