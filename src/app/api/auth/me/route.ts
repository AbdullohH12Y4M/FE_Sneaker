import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { UserService } from '@/server/services';

export const GET = createHandler(
  async (req: NextRequest, ctx) => {
    const userId = ctx.user!.id;
    const profile = await UserService.getProfile(userId);
    return {
      message: 'Profile berhasil diambil',
      data: profile,
    };
  },
  { requiredAuth: true }
);
