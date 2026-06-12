import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { OrderRepository } from '@/server/repositories';

export const GET = createHandler(
  async (req: NextRequest) => {
    // Admin list of all orders
    const orders = await OrderRepository.findAll();
    return {
      message: 'Semua pesanan berhasil diambil',
      data: orders,
    };
  },
  {
    requiredAuth: true,
    requiredRoles: ['ADMIN', 'STAFF'],
  }
);
