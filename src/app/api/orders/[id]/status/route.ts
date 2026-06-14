import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { OrderService } from '@/server/services';
import { ValidationError } from '@/server/errors';
import { OrderStatus } from '@prisma/client';

// All valid transition targets — kept in sync with the Prisma enum.
const VALID_STATUSES = Object.values(OrderStatus);

export const PATCH = createHandler(
  async (req: NextRequest, ctx) => {
    const id = ctx.params.id as string;

    let rawStatus: string;
    let note: string | undefined;

    try {
      const body = await req.json();
      rawStatus = body.status;
      note = body.note;
    } catch {
      throw new ValidationError('Format JSON tidak valid atau kosong');
    }

    if (!rawStatus || !VALID_STATUSES.includes(rawStatus as OrderStatus)) {
      throw new ValidationError(
        `Status tidak valid. Nilai yang diizinkan: ${VALID_STATUSES.join(', ')}`
      );
    }

    // Safe cast — we just validated rawStatus is a member of the enum.
    const status = rawStatus as OrderStatus;

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
