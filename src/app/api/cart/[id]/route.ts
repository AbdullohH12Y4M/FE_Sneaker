import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { CartService } from '@/server/services';

export const PATCH = createHandler(
  async (req: NextRequest, ctx) => {
    const productSkuId = ctx.params.id;
    const { quantity } = await req.json();

    if (quantity === undefined || Number(quantity) < 1) {
      const result = await CartService.removeItem(ctx.user!.id, productSkuId);
      return {
        message: 'Produk dihapus dari keranjang',
        data: result,
      };
    }

    const updated = await CartService.updateItemQuantity(ctx.user!.id, productSkuId, Number(quantity));
    return {
      message: 'Jumlah produk diperbarui',
      data: updated,
    };
  },
  { requiredAuth: true }
);

export const DELETE = createHandler(
  async (req: NextRequest, ctx) => {
    const productSkuId = ctx.params.id;
    const result = await CartService.removeItem(ctx.user!.id, productSkuId);
    return {
      message: 'Produk berhasil dihapus dari keranjang',
      data: result,
    };
  },
  { requiredAuth: true }
);
