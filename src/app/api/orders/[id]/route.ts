import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { OrderService } from '@/server/services';

export const GET = createHandler(
  async (req: NextRequest, ctx) => {
    const id = ctx.params.id;
    const order = await OrderService.getOrderDetails(ctx.user!.id, ctx.user!.role, id);
    return {
      message: 'Detail pesanan berhasil diambil',
      data: order,
    };
  },
  { requiredAuth: true }
);

export const DELETE = createHandler(
  async (req: NextRequest, ctx) => {
    const id = ctx.params.id;
    // Set to CANCELLED (mimics the deletion flow, preserving database record while releasing inventory stock)
    const order = await OrderService.updateOrderStatus(ctx.user!.id, id, 'CANCELLED', 'Dibatalkan oleh pelanggan');
    return {
      message: 'Pesanan berhasil dibatalkan',
      data: order,
    };
  },
  { requiredAuth: true }
);
