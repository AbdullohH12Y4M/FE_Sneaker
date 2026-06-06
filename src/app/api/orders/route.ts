import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, isErrorResponse } from '@/lib/server-auth';

const orderInclude = {
  items: {
    include: {
      sku: {
        include: {
          product: {
            include: { category: { select: { id: true, name: true, slug: true } } },
          },
          inventory: { select: { stock: true } },
        },
      },
    },
  },
};

// GET /api/orders — authenticated user's own orders
export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;
  const sessionUser = authResult;

  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status');
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)));

    const where: Record<string, unknown> = { userId: sessionUser.id };
    if (status) where.status = status;

    const [total, items] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: orderInclude,
      }),
    ]);

    return NextResponse.json({ page, limit, total, totalPages: Math.ceil(total / limit), items });
  } catch (e) {
    console.error('[orders GET]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
