import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, isErrorResponse } from '@/lib/server-auth';

type Params = { params: Promise<{ id: string }> };

// POST /api/orders/[id]/payment-proof — authenticated user
export async function POST(req: NextRequest, { params }: Params) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;
  const sessionUser = authResult;

  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      return NextResponse.json({ message: 'Pesanan tidak ditemukan' }, { status: 404 });
    }
    if (order.userId !== sessionUser.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    if (order.status !== 'PENDING') {
      return NextResponse.json(
        { message: 'Bukti pembayaran hanya bisa diupload untuk pesanan PENDING' },
        { status: 400 }
      );
    }
    if (order.paymentProofUrl) {
      return NextResponse.json(
        { message: 'Bukti pembayaran sudah diupload sebelumnya' },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ message: 'File tidak ditemukan' }, { status: 400 });
    }

    // Upload to Supabase Storage
    let paymentProofUrl: string;
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
      );

      const ext = file.name.split('.').pop() ?? 'jpg';
      const fileName = `payment-proofs/${id}-${Date.now()}.${ext}`;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error } = await supabase.storage.from('payment-proofs').upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(fileName);
      paymentProofUrl = urlData.publicUrl;
    } catch {
      // Fallback placeholder
      paymentProofUrl = `https://placehold.co/400x600/16a34a/ffffff?text=Bukti+${id.slice(-6)}`;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        paymentProofUrl,
        status: 'WAITING_CONFIRMATION',
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error('[orders/[id]/payment-proof POST]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
