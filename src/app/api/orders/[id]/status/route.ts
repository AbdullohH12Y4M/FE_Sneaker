import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, isErrorResponse } from '@/lib/server-auth';

type Params = { params: Promise<{ id: string }> };

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['WAITING_CONFIRMATION', 'CANCELLED'],
  WAITING_CONFIRMATION: ['PAID', 'CANCELLED'],
  PAID: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

// PATCH /api/orders/[id]/status — admin only
export async function PATCH(req: NextRequest, { params }: Params) {
  const authResult = await requireAdmin();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { id } = await params;
    const { status, note } = await req.json();

    const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) {
      return NextResponse.json({ message: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { message: `Transisi dari ${order.status} ke ${status} tidak diizinkan` },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Restore stock on cancel
      if (status === 'CANCELLED') {
        for (const item of order.items) {
          await tx.inventory.update({
            where: { skuId: item.skuId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      await tx.order.update({
        where: { id },
        data: {
          status,
          ...(note !== undefined && { notes: note }),
        },
      });
    });

    const updated = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true } },
        items: { include: { sku: { include: { product: true, inventory: { select: { stock: true } } } } } },
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error('[orders/[id]/status PATCH]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
