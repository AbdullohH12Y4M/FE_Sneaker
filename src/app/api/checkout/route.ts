import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, isErrorResponse } from '@/lib/server-auth';

const SHIPPING_FEES: Record<string, number> = {
  LOWOKWARU: 10000,
  KLOJEN: 10000,
  BLIMBING: 12000,
  SUKUN: 12000,
  KEDUNGKANDANG: 15000,
};

// POST /api/checkout — authenticated, creates order atomically
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;
  const sessionUser = authResult;

  try {
    const body = await req.json();
    const { items, shippingType, district, shippingAddress, paymentMethod } = body;

    if (!items?.length) {
      return NextResponse.json({ message: 'items wajib diisi' }, { status: 400 });
    }
    if (!shippingType || !paymentMethod) {
      return NextResponse.json({ message: 'shippingType dan paymentMethod wajib diisi' }, { status: 400 });
    }
    if (shippingType === 'DELIVERY' && (!district || !shippingAddress)) {
      return NextResponse.json(
        { message: 'district dan shippingAddress wajib diisi untuk pengiriman DELIVERY' },
        { status: 400 }
      );
    }

    // Run in a transaction — decrement stock atomically
    const order = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const orderItemsData: { skuId: string; quantity: number; priceAtPurchase: number }[] = [];

      for (const line of items as { skuId: string; quantity: number }[]) {
        const sku = await tx.productSKU.findUnique({
          where: { id: line.skuId },
          include: {
            product: true,
            inventory: true,
          },
        });

        if (!sku || !sku.product.isActive) {
          throw new Error(`Produk tidak tersedia untuk SKU: ${line.skuId}`);
        }

        const stock = sku.inventory?.stock ?? 0;
        if (stock < line.quantity) {
          throw new Error(`Stok tidak cukup untuk ${sku.color} ukuran EU ${sku.sizeEU}`);
        }

        // Decrement stock
        await tx.inventory.update({
          where: { skuId: line.skuId },
          data: { stock: { decrement: line.quantity } },
        });

        const price = sku.price ?? sku.product.basePrice;
        subtotal += price * line.quantity;
        orderItemsData.push({ skuId: line.skuId, quantity: line.quantity, priceAtPurchase: price });
      }

      const shippingFee =
        shippingType === 'DELIVERY'
          ? SHIPPING_FEES[String(district).toUpperCase()] ?? 10000
          : 0;

      const totalPrice = subtotal + shippingFee;
      const paymentExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // +1 hour

      const newOrder = await tx.order.create({
        data: {
          userId: sessionUser.id,
          status: 'PENDING',
          shippingType,
          shippingAddress: shippingAddress ?? null,
          shippingDistrict: district ?? null,
          shippingFee,
          subtotal,
          totalPrice,
          paymentMethod,
          paymentExpiresAt,
          items: {
            create: orderItemsData,
          },
        },
        include: {
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
      });

      return newOrder;
    });

    return NextResponse.json(order, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Checkout gagal';
    console.error('[checkout POST]', e);
    return NextResponse.json({ message }, { status: 400 });
  }
}
