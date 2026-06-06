import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, isErrorResponse } from '@/lib/server-auth';

type Params = { params: Promise<{ slug: string }> };

/**
 * POST /api/products/[id]/image
 * Upload product image to Supabase Storage and create a ProductImage record.
 * The [slug] param is treated as an ID for mutations.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const authResult = await requireAdmin();
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

    // Upload to Supabase Storage
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    const ext = file.name.split('.').pop() ?? 'jpg';
    const fileName = `products/${id}-${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let imageUrl: string;
    const { error } = await supabase.storage.from('product-images').upload(fileName, buffer, {
      contentType: file.type,
      upsert: true,
    });

    if (error) {
      console.warn('[image upload] Supabase storage error, using placeholder:', error.message);
      imageUrl = `https://placehold.co/600x600/1a1a24/f97316?text=${encodeURIComponent(product.name)}`;
    } else {
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
      imageUrl = urlData.publicUrl;
    }

    // If this is the primary image, unset any existing primary
    if (isPrimary) {
      await prisma.productImage.updateMany({
        where: { productId: id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Determine if this should be primary (first image automatically becomes primary)
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
 * Remove a specific product image.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const authResult = await requireAdmin();
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
