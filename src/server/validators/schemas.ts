import { z } from 'zod';

// Schema untuk register publik (customer) — TIDAK ada field role
export const RegisterSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  name: z.string().optional(),
});

// Schema untuk register admin (dipakai oleh endpoint admin-only)
export const RegisterAdminSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  name: z.string().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export const UpdateProfileSchema = z.object({
  name: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter').optional(),
});

export const AddressSchema = z.object({
  title: z.string().min(1, 'Label alamat wajib diisi (misal: Rumah, Kantor)'),
  recipientName: z.string().min(1, 'Nama penerima wajib diisi'),
  phoneNumber: z.string().min(5, 'Nomor telepon wajib diisi'),
  fullAddress: z.string().min(5, 'Alamat lengkap wajib diisi'),
  province: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  postalCode: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const ProductSchema = z.object({
  categoryId: z.string().min(1, 'Kategori wajib diisi'),
  brandId: z.string().optional(),
  name: z.string().min(1, 'Nama produk wajib diisi'),
  slug: z.string().min(1, 'Slug wajib diisi'),
  skuCode: z.string().optional(),
  description: z.string().optional(),
  basePrice: z.number().int().positive('Harga harus bilangan bulat positif'),
  gender: z.string().optional(),
  releaseYear: z.number().int().optional(),
  isActive: z.boolean().optional(),
  imageUrl: z.string().optional(),
});

export const ProductSkuSchema = z.object({
  productId: z.string().min(1, 'ID produk wajib diisi'),
  color: z.string().min(1, 'Warna wajib diisi'),
  colorHex: z.string().optional(),
  sizeEU: z.number().positive('Ukuran EU wajib diisi'),
  sizeUS: z.string().optional(),
  sizeUK: z.string().optional(),
  sizeCM: z.number().optional(),
  initialStock: z.number().int().nonnegative().optional(),
  price: z.number().int().positive().optional(),
});

export const CategorySchema = z.object({
  name: z.string().min(1, 'Nama kategori wajib diisi'),
  slug: z.string().min(1, 'Slug wajib diisi'),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const CartItemSchema = z.object({
  productSkuId: z.string().min(1, 'ID SKU produk wajib diisi'),
  quantity: z.number().int().positive('Jumlah harus minimal 1'),
});

export const CheckoutSchema = z.object({
  shippingType: z.enum(['DELIVERY', 'PICKUP']),
  shippingAddressId: z.string().optional(), // If using Address model ID
  shippingAddress: z.string().optional(),    // Plain text address fallback
  shippingDistrict: z.string().optional(),
  notes: z.string().optional(),
  paymentMethod: z.enum(['MANUAL_TRANSFER', 'MIDTRANS', 'COD']),
  items: z.array(z.object({
    productSkuId: z.string(),
    quantity: z.number().int().positive(),
  })).min(1, 'Harus ada minimal 1 produk'),
});
