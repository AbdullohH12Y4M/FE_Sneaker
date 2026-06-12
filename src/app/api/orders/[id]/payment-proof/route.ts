import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { OrderService } from '@/server/services';

export const POST = createHandler(
  async (req: NextRequest, ctx) => {
    const orderId = ctx.params.id;
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const note = formData.get('note') as string | null;

    if (!file) {
      throw new Error('File tidak ditemukan');
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const order = await OrderService.uploadPaymentProof(
      ctx.user!.id,
      orderId,
      buffer,
      file.name,
      file.type,
      note || undefined
    );

    return {
      message: 'Bukti pembayaran berhasil diunggah',
      data: order,
    };
  },
  { requiredAuth: true }
);
