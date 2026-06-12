import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { RegisterSchema } from '@/server/validators/schemas';
import { UserService } from '@/server/services';

export const POST = createHandler(
  async (req: NextRequest, ctx) => {
    const body = ctx.body;
    const user = await UserService.register({ ...body, role: 'CUSTOMER' });
    return {
      message: 'Registrasi berhasil',
      data: { user },
    };
  },
  { schema: RegisterSchema }
);
