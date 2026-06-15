import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminOrStaff, isErrorResponse } from '@/lib/server-auth';

// GET /api/orders/admin/export — admin or staff, export transactions
export async function GET(req: NextRequest) {
  const authResult = await requireAdminOrStaff(req);
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { searchParams } = req.nextUrl;
    const format = searchParams.get('format') || 'csv';
    const status = searchParams.get('status') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate);
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, name: true } },
        items: {
          include: {
            sku: {
              include: {
                product: { select: { name: true, skuCode: true } },
              },
            },
          },
        },
      },
    });

    if (format === 'csv') {
      return exportToCsv(orders);
    } else if (format === 'json') {
      return exportToJson(orders);
    } else {
      return NextResponse.json({ message: 'Format tidak didukung. Gunakan csv atau json.' }, { status: 400 });
    }
  } catch (e) {
    console.error('[orders/admin/export GET]', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

function exportToJson(orders: Array<{
  id: string;
  user: { id: string; email: string; name: string | null };
  status: string;
  createdAt: Date;
  totalPrice: number;
  shippingFee: number;
  subtotal: number;
  shippingType: string;
  paymentMethod: string;
  shippingDistrict: string | null;
  shippingAddress: string | null;
  items: Array<{
    quantity: number;
    priceAtPurchase: number;
    sku: { product: { name: string; skuCode: string | null }; color: string; sizeEU: number };
  }>;
}>) {
  const data = orders.map((o) => ({
    id: o.id,
    userEmail: o.user.email,
    userName: o.user.name,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    subtotal: o.subtotal,
    shippingFee: o.shippingFee,
    totalPrice: o.totalPrice,
    shippingType: o.shippingType,
    paymentMethod: o.paymentMethod,
    shippingDistrict: o.shippingDistrict,
    shippingAddress: o.shippingAddress,
    items: o.items.map((i) => ({
      productName: i.sku.product.name,
      skuCode: i.sku.product.skuCode,
      color: i.sku.color,
      sizeEU: i.sku.sizeEU,
      quantity: i.quantity,
      priceAtPurchase: i.priceAtPurchase,
    })),
  }));

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="riwayat-transaksi.json"',
    },
  });
}

function exportToCsv(orders: Array<{
  id: string;
  user: { id: string; email: string; name: string | null };
  status: string;
  createdAt: Date;
  totalPrice: number;
  shippingFee: number;
  subtotal: number;
  shippingType: string;
  paymentMethod: string;
  shippingDistrict: string | null;
  shippingAddress: string | null;
  items: Array<{
    quantity: number;
    priceAtPurchase: number;
    sku: { product: { name: string; skuCode: string | null }; color: string; sizeEU: number };
  }>;
}>) {
  const headers = [
    'ID Pesanan',
    'Email Pengguna',
    'Nama Pengguna',
    'Status',
    'Tanggal',
    'Subtotal',
    'Ongkir',
    'Total',
    'Tipe Pengiriman',
    'Metode Pembayaran',
    'Kecamatan',
    'Alamat',
    'Nama Produk',
    'SKU Code',
    'Warna',
    'Ukuran EU',
    'Jumlah',
    'Harga Satuan',
  ];

  const rows: string[] = [];
  for (const order of orders) {
    const orderDate = order.createdAt.toLocaleDateString('id-ID');
    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      const row = [
        `"${order.id}"`,
        `"${order.user.email}"`,
        `"${order.user.name ?? '-'}"`,
        `"${order.status}"`,
        `"${orderDate}"`,
        `"${order.subtotal}"`,
        `"${order.shippingFee}"`,
        `"${order.totalPrice}"`,
        `"${order.shippingType}"`,
        `"${order.paymentMethod}"`,
        `"${order.shippingDistrict ?? '-'}"`,
        `"${order.shippingAddress ? order.shippingAddress.replace(/"/g, '""') : '-'}"`,
        `"${item.sku.product.name}"`,
        `"${item.sku.product.skuCode ?? '-'}"`,
        `"${item.sku.color}"`,
        `"${item.sku.sizeEU}"`,
        `"${item.quantity}"`,
        `"${item.priceAtPurchase}"`,
      ];
      rows.push(row.join(','));
    }
  }

  const csvContent = [headers.join(','), ...rows].join('\n');

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="riwayat-transaksi.csv"',
    },
  });
}