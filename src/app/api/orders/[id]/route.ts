import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { OrderService } from '@/server/services';
import { ForbiddenError, NotFoundError } from '@/server/errors';
import { OrderRepository } from '@/server/repositories';
import { OrderStatus } from '@prisma/client';

export const GET = createHandler(
  async (req: NextRequest, ctx) => {
    const id = ctx.params.id as string;
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
    const id = ctx.params.id as string;
    const userId = ctx.user!.id;
    const userRole = ctx.user!.role;

    // ── Ownership / authorisation check ────────────────────────────────────
    // Fetch the order first so we can verify the caller is allowed to cancel it.
    // An ADMIN or STAFF member may cancel any order; a CUSTOMER may only cancel
    // their own orders.  Without this check any authenticated user could cancel
    // any order by knowing (or guessing) its ID — a classic IDOR vulnerability.
    const existing = await OrderRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Pesanan tidak ditemukan');
    }

    const isOwner = existing.userId === userId;
    const isPrivileged = userRole === 'ADMIN' || userRole === 'STAFF';

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenError('Akses ditolak: Anda tidak memiliki izin untuk membatalkan pesanan ini');
    }

    // Only allow cancellation of orders that are still in a cancellable state
    const cancellableStatuses = ['PENDING', 'WAITING_CONFIRMATION'];
    if (!cancellableStatuses.includes(existing.status) && !isPrivileged) {
      throw new ForbiddenError(
        `Pesanan tidak dapat dibatalkan karena statusnya sudah "${existing.status}". ` +
          'Hubungi admin untuk pembatalan paksa.'
      );
    }

    // Set to CANCELLED — preserves the database record and restores inventory
    // stock (handled atomically inside OrderRepository.updateStatus).
    const order = await OrderService.updateOrderStatus(
      userId,
      id,
      OrderStatus.CANCELLED,
      isPrivileged && !isOwner
        ? `Dibatalkan oleh ${userRole.toLowerCase()}`
        : 'Dibatalkan oleh pelanggan'
    );

    return {
      message: 'Pesanan berhasil dibatalkan',
      data: order,
    };
  },
  { requiredAuth: true }
);
