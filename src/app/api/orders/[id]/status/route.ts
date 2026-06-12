import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { OrderService } from '@/server/services';

export const PATCH = createHandler(
  async (req: NextRequest, ctx) => {
    const id = ctx.params.id;

    let status: string;
    let note: string | undefined;
    try {
      const body = await req.json();
      status = body.status;
      note = body.note;
    } catch {
      throw new Error('Format JSON tidak valid atau kosong');
    }

    const VALID_STATUSES = [
      'PENDING',
      'WAITING_CONFIRMATION',
      'PAID',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
    ];
    if (!status || !VALID_STATUSES.includes(status)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Status tidak valid. Nilai yang diizinkan: ${VALID_STATUSES.join(', ')}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

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
