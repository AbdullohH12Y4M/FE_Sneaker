import { NextRequest } from 'next/server';
import { createHandler } from '@/server/utils/route-handler';
import { UploadService } from '@/server/services';

export const POST = createHandler(
  async (req: NextRequest) => {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      throw new Error('File tidak ditemukan');
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await UploadService.uploadFile(buffer, file.type, 'sneakerlocal/general');
    return {
      message: 'File berhasil diunggah',
      data: result,
    };
  },
  {
    requiredAuth: true,
    requiredRoles: ['ADMIN', 'STAFF'],
  }
);
