import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { UserService } from '@/server/services';

export const POST = createHandler(async () => {
  const result = await UserService.logout();
  return {
    message: 'Logout berhasil',
    data: result,
  };
});
