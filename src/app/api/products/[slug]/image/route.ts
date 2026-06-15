import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminOrStaff, isErrorResponse } from '@/lib/server-auth';
import { v2 as cloudinary } from 'cloudinary';

type Params = { params: Promise<{ slug: string }> };

/** Lazy Cloudinary config — reads env vars at request time, not module load time. */
function getCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

/**
 * POST /api/products/[id]/image
 * Upload product image to Cloudinary and create a ProductImage record.
 * The [slug] param is treated as a product ID for mutations.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const authResult = await requireAdminOrStaff(req);
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { slug: id } = await params;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ message: 'Produk tidak ditemukan' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ message: 'File tidak ditemukan' }, { status: 400 });
    }

    const isPrimary = formData.get('isPrimary') === 'true';

    // Upload to Cloudinary
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeMimeType = file.type.startsWith('image/') ? file.type : 'image/jpeg';
    const base64File = `data:${safeMimeType};base64,${buffer.toString('base64')}`;

    const cld = getCloudinary();
    let imageUrl: string;

    try {
      const uploadResult = await cld.uploader.upload(base64File, {
        folder: 'sneakerlocal/products',
        resource_type: 'image',
        public_id: `product-${id}-${Date.now()}`,
      });
      imageUrl = uploadResult.secure_url;
    } catch (uploadErr: unknown) {
      let msg = 'Upload gagal';
      if (uploadErr && typeof uploadErr === 'object') {
        const e = uploadErr as Record<string, unknown>;
        if (e.error && typeof e.error === 'object') {
          msg = (e.error as Record<string, unknown>).message as string ?? msg;
        } else if (typeof e.message === 'string') {
          msg = e.message;
        } else {
          msg = JSON.stringify(uploadErr);
        }
      } else if (uploadErr instanceof Error) {
        msg = uploadErr.message;
      }
      console.error('[products/image POST] Cloudinary error:', JSON.stringify(uploadErr));
      return NextResponse.json({ message: `Gagal mengunggah gambar: ${msg}` }, { status: 500 });
    }

    // If this is the primary image, unset any existing primary
    if (isPrimary) {
      await prisma.productImage.updateMany({
        where: { productId: id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // First image automatically becomes primary
    const existingCount = await prisma.productImage.count({ where: { productId: id } });
    const shouldBePrimary = isPrimary || existingCount === 0;

    const productImage = await prisma.productImage.create({
      data: { productId: id, url: imageUrl, isPrimary: shouldBePrimary },
    });

    return NextResponse.json({ imageUrl, productImage });
  } catch (e) {
    console.error('[products/[id]/image POST]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/products/[id]/image?imageId=xxx
 * Remove a specific product image record from DB.
 * Note: Cloudinary file is NOT deleted here to preserve CDN cache.
 * Use Cloudinary dashboard to clean up unused assets.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const authResult = await requireAdminOrStaff(req);
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { slug: productId } = await params;
    const imageId = req.nextUrl.searchParams.get('imageId');

    if (!imageId) {
      return NextResponse.json({ message: 'imageId wajib diisi' }, { status: 400 });
    }

    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });

    if (!image) {
      return NextResponse.json({ message: 'Gambar tidak ditemukan' }, { status: 404 });
    }

    await prisma.productImage.delete({ where: { id: imageId } });
    return NextResponse.json({ success: true, message: 'Gambar berhasil dihapus' });
  } catch (e) {
    console.error('[products/[id]/image DELETE]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
