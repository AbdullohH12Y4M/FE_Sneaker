import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, isErrorResponse } from '@/lib/server-auth';

type Params = { params: Promise<{ id: string }> };

// GET /api/orders/[id]/receipt — authenticated
export async function GET(req: NextRequest, { params }: Params) {
  const authResult = await requireAuth(req);
  if (isErrorResponse(authResult)) return authResult;
  const sessionUser = authResult;

  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, name: true } },
        items: {
          include: { sku: { include: { product: true } } },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ message: 'Pesanan tidak ditemukan' }, { status: 404 });
    }
    if (sessionUser.role !== 'ADMIN' && order.userId !== sessionUser.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Generate a simple text receipt (can be upgraded to PDF with a library)
    const lines = [
      `Struk Pesanan SneakerLocal`,
      `===========================`,
      `ID Pesanan  : ${order.id}`,
      `Tanggal     : ${order.createdAt.toISOString()}`,
      `Status      : ${order.status}`,
      `Pembeli     : ${order.user?.email ?? '-'}`,
      ``,
      `Item:`,
      ...order.items.map(
        (item) =>
          `  - ${item.sku.product.name} (${item.sku.color} EU${item.sku.sizeEU}) x${item.quantity} @ Rp${item.priceAtPurchase.toLocaleString('id-ID')}`
      ),
      ``,
      `Subtotal    : Rp${order.subtotal.toLocaleString('id-ID')}`,
      `Ongkir      : Rp${order.shippingFee.toLocaleString('id-ID')}`,
      `Total       : Rp${order.totalPrice.toLocaleString('id-ID')}`,
      `Pembayaran  : ${order.paymentMethod}`,
    ].join('\n');

    return new NextResponse(lines, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="receipt-${id}.txt"`,
      },
    });
  } catch (e) {
    console.error('[orders/[id]/receipt GET]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
