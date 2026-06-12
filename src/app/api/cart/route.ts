import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { CartItemSchema } from '@/server/validators/schemas';
import { CartService } from '@/server/services';

export const GET = createHandler(
  async (req: NextRequest, ctx) => {
    const cart = await CartService.getCart(ctx.user!.id);
    return {
      message: 'Keranjang berhasil diambil',
      data: cart,
    };
  },
  { requiredAuth: true }
);

export const POST = createHandler(
  async (req: NextRequest, ctx) => {
    const body = ctx.body;
    const item = await CartService.addItem(ctx.user!.id, body);
    return {
      message: 'Produk berhasil ditambahkan ke keranjang',
      data: item,
    };
  },
  {
    requiredAuth: true,
    schema: CartItemSchema,
  }
);

export const DELETE = createHandler(
  async (req: NextRequest, ctx) => {
    const result = await CartService.clearCart(ctx.user!.id);
    return {
      message: 'Keranjang berhasil dikosongkan',
      data: result,
    };
  },
  { requiredAuth: true }
);
