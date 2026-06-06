import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, isErrorResponse } from '@/lib/server-auth';

// GET /api/orders/admin — admin only, all orders
export async function GET(req: NextRequest) {
  const authResult = await requireAdmin();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status');
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)));

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [total, items] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, name: true } },
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
        },
      }),
    ]);

    return NextResponse.json({ page, limit, total, totalPages: Math.ceil(total / limit), items });
  } catch (e) {
    console.error('[orders/admin GET]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
