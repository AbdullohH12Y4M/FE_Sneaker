import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { AdminService } from '@/server/services';

export const GET = createHandler(
  async (req: NextRequest, ctx) => {
    const dashboardData = await AdminService.getDashboard(ctx.user!.id);
    return {
      message: 'Data dashboard admin berhasil diambil',
      data: dashboardData,
    };
  },
  {
    requiredAuth: true,
    requiredRoles: ['ADMIN', 'STAFF'],
  }
);
