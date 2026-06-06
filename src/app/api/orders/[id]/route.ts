import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, isErrorResponse } from '@/lib/server-auth';

type Params = { params: Promise<{ id: string }> };

const orderInclude = {
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
};

// GET /api/orders/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;
  const sessionUser = authResult;

  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });

    if (!order) {
      return NextResponse.json({ message: 'Pesanan tidak ditemukan' }, { status: 404 });
    }
    if (sessionUser.role !== 'ADMIN' && order.userId !== sessionUser.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(order);
  } catch (e) {
    console.error('[orders/[id] GET]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/orders/[id] — customer can cancel PENDING, admin can delete any
export async function DELETE(_req: NextRequest, { params }: Params) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;
  const sessionUser = authResult;

  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ message: 'Pesanan tidak ditemukan' }, { status: 404 });
    }
    if (sessionUser.role !== 'ADMIN' && order.userId !== sessionUser.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    if (sessionUser.role !== 'ADMIN' && order.status !== 'PENDING') {
      return NextResponse.json(
        { message: 'Order hanya bisa dibatalkan saat status PENDING' },
        { status: 400 }
      );
    }

    // Restore stock
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.inventory.update({
          where: { skuId: item.skuId },
          data: { stock: { increment: item.quantity } },
        });
      }
      await tx.order.update({ where: { id }, data: { status: 'CANCELLED' } });
    });

    return NextResponse.json({ success: true, message: 'Pesanan berhasil dibatalkan' });
  } catch (e) {
    console.error('[orders/[id] DELETE]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
