import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { OrderService } from '@/server/services';
import { validateUploadedFile } from '@/server/utils/validate-upload';

export const POST = createHandler(
  async (req: NextRequest, ctx) => {
    const orderId = ctx.params.id;
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const note = formData.get('note') as string | null;

    // Validates MIME type (whitelist) and size (≤ 5 MB) — throws on failure
    const validFile = validateUploadedFile(file);

    const arrayBuffer = await validFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const order = await OrderService.uploadPaymentProof(
      ctx.user!.id,
      orderId,
      buffer,
      validFile.name,
      validFile.type,
      note || undefined
    );

    return {
      message: 'Bukti pembayaran berhasil diunggah',
      data: order,
    };
  },
  { requiredAuth: true }
);
