import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { CheckoutSchema } from '@/server/validators/schemas';
import { OrderService } from '@/server/services';

export const POST = createHandler(
  async (req: NextRequest, ctx) => {
    const body = (req as any).validatedBody;
    const order = await OrderService.checkout(ctx.user!.id, body);
    return {
      message: 'Checkout berhasil',
      data: order,
    };
  },
  {
    requiredAuth: true,
    schema: CheckoutSchema,
  }
);
