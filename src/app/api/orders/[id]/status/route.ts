import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { OrderService } from '@/server/services';

export const PATCH = createHandler(
  async (req: NextRequest, ctx) => {
    const id = ctx.params.id;
    const { status, note } = await req.json();

    const order = await OrderService.updateOrderStatus(ctx.user!.id, id, status, note);
    return {
      message: 'Status pesanan berhasil diperbarui',
      data: order,
    };
  },
  {
    requiredAuth: true,
    requiredRoles: ['ADMIN', 'STAFF'],
  }
);
