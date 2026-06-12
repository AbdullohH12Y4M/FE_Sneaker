import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { RegisterAdminSchema } from '@/server/validators/schemas';
import { UserService } from '@/server/services';

export const POST = createHandler(
  async (req: NextRequest, ctx) => {
    const body = ctx.body;
    const user = await UserService.register({ ...body, role: 'ADMIN' });
    return {
      message: 'Registrasi admin berhasil',
      data: { user },
    };
  },
  {
    requiredAuth: true,
    requiredRoles: ['ADMIN'],
    schema: RegisterAdminSchema,
  }
);
