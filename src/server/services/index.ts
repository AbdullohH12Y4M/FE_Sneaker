import {
  UserRepository,
  AddressRepository,
  ProductRepository,
  CategoryRepository,
  CartRepository,
  OrderRepository,
  SettingRepository,
  AuditRepository,
  ValidatedOrderItem,
} from '../repositories';
import {
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../errors';
import { hashPassword, verifyPassword } from '@/lib/password';
import { setAuthCookies, clearAuthCookies, TokenPayload } from '../auth/jwt';
import { v2 as cloudinary } from 'cloudinary';
import { OrderStatus } from '@prisma/client';

// ─── Cloudinary helper — config dipanggil lazy agar env vars tersedia saat runtime ─
// Cloudinary v2 config is idempotent; calling it per-request is safe and cheap.
function getCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

// ─── USER SERVICE ────────────────────────────────────────────────────────────
export const UserService = {
  async register(data: any) {
    const existing = await UserRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictError('Email sudah terdaftar');
    }

    const hashedPassword = await hashPassword(data.password);
    const user = await UserRepository.create({
      email: data.email,
      password: hashedPassword,
      name: data.name || data.email.split('@')[0],
      role: data.role || 'CUSTOMER',
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  },

  async login(data: any) {
    const user = await UserRepository.findByEmail(data.email);
    if (!user) {
      throw new UnauthorizedError('Email atau password salah');
    }

    const valid = await verifyPassword(data.password, user.password);
    if (!valid) {
      throw new UnauthorizedError('Email atau password salah');
    }

    const payload: TokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    await setAuthCookies(payload);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  },

  async logout() {
    await clearAuthCookies();
    return { success: true };
  },

  async getProfile(userId: string) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User tidak ditemukan');
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  },

  async updateProfile(userId: string, data: any) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User tidak ditemukan');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;

    if (data.newPassword) {
      if (!data.currentPassword) {
        throw new ValidationError('Password saat ini wajib diisi untuk mengubah password');
      }
      const valid = await verifyPassword(data.currentPassword, user.password);
      if (!valid) {
        throw new ValidationError('Password saat ini salah');
      }
      updateData.password = await hashPassword(data.newPassword);
    }

    const updated = await UserRepository.update(userId, updateData);
    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
    };
  },

  // Address
  async getAddresses(userId: string) {
    return AddressRepository.findByUserId(userId);
  },

  async createAddress(userId: string, data: any) {
    return AddressRepository.create({
      userId,
      ...data,
    });
  },

  async updateAddress(userId: string, id: string, data: any) {
    const address = await AddressRepository.findById(id);
    if (!address || address.userId !== userId) {
      throw new NotFoundError('Alamat tidak ditemukan');
    }
    return AddressRepository.update(id, userId, data);
  },

  async deleteAddress(userId: string, id: string) {
    const address = await AddressRepository.findById(id);
    if (!address || address.userId !== userId) {
      throw new NotFoundError('Alamat tidak ditemukan');
    }
    await AddressRepository.softDelete(id);
    return { success: true };
  },
};

// ─── PRODUCT SERVICE ─────────────────────────────────────────────────────────
export const ProductService = {
  async getProducts(params: any) {
    const page = Math.max(1, Number(params.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(params.limit ?? 20)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      ProductRepository.findMany({ ...params, skip, take: limit }),
      ProductRepository.count(params),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items: items.map((p) => ({
        ...p,
        images: p.images.map((img) => img.url),
      })),
    };
  },

  async getProductBySlugOrId(slugOrId: string) {
    const product = await ProductRepository.findBySlugOrId(slugOrId);
    if (!product) {
      throw new NotFoundError('Produk tidak ditemukan');
    }
    return {
      ...product,
      images: product.images.map((img) => img.url),
    };
  },

  async createProduct(adminId: string, data: any) {
    const existing = await ProductRepository.findBySlug(data.slug);
    if (existing) {
      throw new ConflictError('Slug produk sudah digunakan');
    }

    const product = await ProductRepository.create({
      category: { connect: { id: data.categoryId } },
      ...(data.brandId ? { brand: { connect: { id: data.brandId } } } : {}),
      name: data.name,
      slug: data.slug,
      skuCode: data.skuCode,
      description: data.description || '',
      basePrice: data.basePrice,
      gender: data.gender || 'UNISEX',
      isActive: data.isActive !== false,
      ...(data.imageUrl
        ? { images: { create: [{ url: data.imageUrl, isPrimary: true }] } }
        : {}),
    });

    await AuditRepository.log(adminId, 'CREATE', 'Product', product.id, { name: product.name });
    return product;
  },

  async updateProduct(adminId: string, id: string, data: any) {
    const product = await ProductRepository.findById(id);
    if (!product) {
      throw new NotFoundError('Produk tidak ditemukan');
    }

    if (data.slug && data.slug !== product.slug) {
      const existing = await ProductRepository.findBySlug(data.slug);
      if (existing) {
        throw new ConflictError('Slug produk sudah digunakan');
      }
    }

    const updated = await ProductRepository.update(id, data);
    await AuditRepository.log(adminId, 'UPDATE', 'Product', id, data);
    return updated;
  },

  async deleteProduct(adminId: string, id: string) {
    const product = await ProductRepository.findById(id);
    if (!product) {
      throw new NotFoundError('Produk tidak ditemukan');
    }

    await ProductRepository.softDelete(id);
    await AuditRepository.log(adminId, 'DELETE', 'Product', id, { name: product.name });
    return { success: true };
  },

  // SKUs and Stock
  async createSku(adminId: string, data: any) {
    const sku = await ProductRepository.createSku({
      product: { connect: { id: data.productId } },
      color: data.color,
      colorHex: data.colorHex || '#888888',
      sizeEU: Number(data.sizeEU),
      sizeUS: data.sizeUS,
      sizeUK: data.sizeUK,
      sizeCM: data.sizeCM ? Number(data.sizeCM) : null,
      price: data.price ? Number(data.price) : null,
      inventory: { create: { stock: Number(data.initialStock ?? 0) } },
    });

    if (data.initialStock) {
      await ProductRepository.updateStock(sku.id, data.initialStock, 'RESTOCK', 'Stok Awal SKU Baru');
    }

    await AuditRepository.log(adminId, 'CREATE_SKU', 'ProductSKU', sku.id, { color: sku.color, sizeEU: sku.sizeEU });
    return sku;
  },

  async updateSku(adminId: string, skuId: string, data: any) {
    const sku = await ProductRepository.findSkuById(skuId);
    if (!sku) {
      throw new NotFoundError('SKU tidak ditemukan');
    }

    const updated = await ProductRepository.updateSku(skuId, data);
    await AuditRepository.log(adminId, 'UPDATE_SKU', 'ProductSKU', skuId, data);
    return updated;
  },

  async deleteSku(adminId: string, skuId: string) {
    const sku = await ProductRepository.findSkuById(skuId);
    if (!sku) {
      throw new NotFoundError('SKU tidak ditemukan');
    }

    await ProductRepository.deleteSku(skuId);
    await AuditRepository.log(adminId, 'DELETE_SKU', 'ProductSKU', skuId, { color: sku.color, sizeEU: sku.sizeEU });
    return { success: true };
  },

  async updateStock(adminId: string, skuId: string, stock: number) {
    const sku = await ProductRepository.findSkuById(skuId);
    if (!sku) {
      throw new NotFoundError('SKU tidak ditemukan');
    }

    const currentStock = sku.inventory?.stock ?? 0;
    const diff = stock - currentStock;

    const inventory = await ProductRepository.updateStock(
      skuId,
      stock,
      diff >= 0 ? 'RESTOCK' : 'ADJUSTMENT',
      `Penyesuaian stok oleh admin`
    );

    await AuditRepository.log(adminId, 'UPDATE_STOCK', 'Inventory', skuId, { stock, diff });
    return inventory;
  },
};

// ─── CATEGORY SERVICE ────────────────────────────────────────────────────────
export const CategoryService = {
  async getCategories(params?: { isActive?: boolean }) {
    return CategoryRepository.findAll(params);
  },

  async getCategory(id: string) {
    const category = await CategoryRepository.findById(id);
    if (!category) {
      throw new NotFoundError('Kategori tidak ditemukan');
    }
    return category;
  },

  async createCategory(adminId: string, data: any) {
    const existing = await CategoryRepository.findBySlugIncludingDeleted(data.slug);
    if (existing) {
      if (existing.deletedAt) {
        throw new ConflictError(
          `Slug "${data.slug}" sudah digunakan oleh kategori yang dihapus "${existing.name}". Gunakan slug lain atau pulihkan kategori yang sudah ada.`
        );
      }
      throw new ConflictError('Slug kategori sudah digunakan');
    }

    const category = await CategoryRepository.create(data);
    await AuditRepository.log(adminId, 'CREATE', 'Category', category.id, { name: category.name });
    return category;
  },
  async updateCategory(adminId: string, id: string, data: any) {
    const category = await CategoryRepository.findById(id);
    if (!category) {
      throw new NotFoundError('Kategori tidak ditemukan');
    }

    if (data.slug && data.slug !== category.slug) {
      const existing = await CategoryRepository.findBySlug(data.slug);
      if (existing) {
        throw new ConflictError('Slug kategori sudah digunakan');
      }
    }

    const updated = await CategoryRepository.update(id, data);
    await AuditRepository.log(adminId, 'UPDATE', 'Category', id, data);
    return updated;
  },

  async deleteCategory(adminId: string, id: string) {
    const category = await CategoryRepository.findById(id);
    if (!category) {
      throw new NotFoundError('Kategori tidak ditemukan');
    }

    await CategoryRepository.softDelete(id);
    await AuditRepository.log(adminId, 'DELETE', 'Category', id, { name: category.name });
    return { success: true };
  },
};

// ─── CART SERVICE ────────────────────────────────────────────────────────────
export const CartService = {
  async getCart(userId: string) {
    const cart = await CartRepository.findByUserId(userId);
    if (!cart) {
      return CartRepository.getOrCreateCart(userId);
    }
    return cart;
  },

  async addItem(userId: string, data: any) {
    const cart = await CartRepository.getOrCreateCart(userId);
    const sku = await ProductRepository.findSkuById(data.productSkuId);
    if (!sku) {
      throw new NotFoundError('Varian SKU tidak ditemukan');
    }

    const stock = sku.inventory?.stock ?? 0;
    if (stock < data.quantity) {
      throw new ValidationError(`Stok terbatas. Hanya tersedia ${stock} item.`);
    }

    return CartRepository.addItem(cart.id, data.productSkuId, data.quantity);
  },

  async updateItemQuantity(userId: string, productSkuId: string, quantity: number) {
    const cart = await CartRepository.findByUserId(userId);
    if (!cart) {
      throw new NotFoundError('Keranjang tidak ditemukan');
    }

    const sku = await ProductRepository.findSkuById(productSkuId);
    if (!sku) {
      throw new NotFoundError('Varian SKU tidak ditemukan');
    }

    const stock = sku.inventory?.stock ?? 0;
    if (stock < quantity) {
      throw new ValidationError(`Stok terbatas. Hanya tersedia ${stock} item.`);
    }

    return CartRepository.updateItemQuantity(cart.id, productSkuId, quantity);
  },

  async removeItem(userId: string, productSkuId: string) {
    const cart = await CartRepository.findByUserId(userId);
    if (!cart) {
      throw new NotFoundError('Keranjang tidak ditemukan');
    }
    return CartRepository.removeItem(cart.id, productSkuId);
  },

  async clearCart(userId: string) {
    const cart = await CartRepository.findByUserId(userId);
    if (cart) {
      await CartRepository.clearCart(cart.id);
    }
    return { success: true };
  },
};

// ─── ORDER SERVICE ───────────────────────────────────────────────────────────
export const OrderService = {
  /**
   * Process a checkout request.
   *
   * ── Stock safety design ────────────────────────────────────────────────────
   * We intentionally do NOT validate stock here in the service layer before
   * calling OrderRepository.create().  The definitive stock check happens
   * INSIDE the database transaction in OrderRepository.create() using
   * SELECT FOR UPDATE row-level locks.
   *
   * Why?  A pre-check outside the transaction is always a TOCTOU (time-of-check
   * / time-of-use) race: stock could change between the check and the deduction.
   * The only correct place to check-and-deduct atomically is inside the same
   * serializable transaction that holds the row lock.
   *
   * We still do a lightweight pre-flight here to:
   *   a) resolve prices (requires a DB read anyway), and
   *   b) give a fast, friendly error for obviously out-of-stock SKUs before
   *      we even enter a transaction — this is a UX optimisation, not a
   *      security/correctness guarantee.
   */
  async checkout(userId: string, data: any) {
    // ── Step 1: Batch-fetch all requested SKUs in a single query ──────────
    // Avoid N+1: do NOT fetch each SKU inside a loop.
    const requestedSkuIds: string[] = data.items.map((i: any) => i.productSkuId as string);

    const skus = await ProductRepository.findSkusByIds(requestedSkuIds);
    const skuMap = new Map(skus.map((s) => [s.id, s]));

    // ── Step 2: Build validated item list and compute subtotal ────────────
    // This is a pre-flight price resolution — NOT the authoritative stock check.
    let subtotal = 0;
    const itemsToCreate: ValidatedOrderItem[] = [];

    for (const item of data.items) {
      const sku = skuMap.get(item.productSkuId);
      if (!sku) {
        throw new NotFoundError(`Varian produk dengan ID "${item.productSkuId}" tidak ditemukan`);
      }

      // Fast pre-flight: if stock is obviously 0 right now, fail early.
      // The authoritative check is inside the transaction.
      const currentStock = sku.inventory?.stock ?? 0;
      if (currentStock < item.quantity) {
        throw new ValidationError(
          `Stok tidak mencukupi untuk ${sku.product.name} — ` +
            `warna ${sku.color}, ukuran EU ${sku.sizeEU}. ` +
            `Tersedia: ${currentStock}, diminta: ${item.quantity}.`
        );
      }

      const price = sku.price ?? sku.product.basePrice;
      subtotal += price * item.quantity;

      itemsToCreate.push({
        skuId: item.productSkuId,
        quantity: item.quantity,
        priceAtPurchase: price,
      });
    }

    // ── Step 3: Resolve shipping fee ──────────────────────────────────────
    const shippingFeeSetting = await SettingRepository.get('shipping_fee');
    const shippingFee = data.shippingType === 'DELIVERY'
      ? Number(shippingFeeSetting ?? 20000)
      : 0;
    const totalPrice = subtotal + shippingFee;

    // ── Step 4: Resolve shipping address ─────────────────────────────────
    let fullShippingAddress = data.shippingAddress || '';
    if (data.shippingAddressId) {
      const address = await AddressRepository.findById(data.shippingAddressId);
      if (address) {
        fullShippingAddress = [
          `${address.recipientName} (${address.phoneNumber})`,
          address.fullAddress,
          address.district,
          address.city,
          address.province,
          address.postalCode,
        ]
          .filter(Boolean)
          .join(', ');
      }
    }

    // ── Step 5: Create order atomically (stock deducted inside transaction) ─
    // OrderRepository.create() uses SELECT FOR UPDATE + SERIALIZABLE isolation
    // to prevent overselling even under concurrent load.
    const paymentExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24 h

    const order = await OrderRepository.create(
      {
        userId,
        status: 'PENDING',
        shippingType: data.shippingType,
        shippingAddress: fullShippingAddress,
        shippingDistrict: data.shippingDistrict ?? null,
        shippingFee,
        shippingCost: shippingFee,
        subtotal,
        totalPrice,
        paymentMethod: data.paymentMethod,
        paymentExpiresAt,
        notes: data.notes ?? '',
      },
      itemsToCreate
    );

    // Clear the user's server-side cart after a successful checkout
    await CartService.clearCart(userId);

    return order;
  },

  async getMyOrders(userId: string) {
    return OrderRepository.findByUserId(userId);
  },

  async getOrderDetails(userId: string, userRole: string, id: string) {
    const order = await OrderRepository.findById(id);
    if (!order) {
      throw new NotFoundError('Order tidak ditemukan');
    }

    if (userRole !== 'ADMIN' && userRole !== 'STAFF' && order.userId !== userId) {
      throw new ForbiddenError('Akses ditolak');
    }

    return order;
  },

  async uploadPaymentProof(userId: string, orderId: string, fileBuffer: Buffer, fileName: string, mimeType: string, note?: string) {
    const order = await OrderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order tidak ditemukan');
    }

    if (order.userId !== userId) {
      throw new ForbiddenError('Akses ditolak');
    }

    // Validate Cloudinary credentials before attempting upload
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      throw new ValidationError('Konfigurasi upload tidak lengkap. Hubungi administrator.');
    }

    // Upload to Cloudinary — lazy config to ensure env vars are read at request time
    const cld = getCloudinary();

    // Ensure mimeType is a valid image type — Cloudinary rejects unknown types
    const safeMimeType = mimeType && mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
    const base64File = `data:${safeMimeType};base64,${fileBuffer.toString('base64')}`;

    console.info(`[uploadPaymentProof] Uploading: orderId=${orderId}, mimeType=${safeMimeType}, size=${fileBuffer.length}B`);

    let uploadResult: { secure_url: string };
    try {
      uploadResult = await cld.uploader.upload(base64File, {
        folder: 'sneakerlocal/payments',
        resource_type: 'image',
      });
      console.info(`[uploadPaymentProof] Success: ${uploadResult.secure_url}`);
    } catch (uploadErr: unknown) {
      // Cloudinary SDK v2 throws a plain object, not an Error instance.
      // Shape: { error: { message: string }, http_code?: number }
      // or just: { message: string, http_code: number }
      let msg = 'Upload gagal';
      if (uploadErr && typeof uploadErr === 'object') {
        const e = uploadErr as Record<string, unknown>;
        // Try nested .error.message first (SDK v2 typical shape)
        if (e.error && typeof e.error === 'object') {
          msg = (e.error as Record<string, unknown>).message as string ?? msg;
        } else if (typeof e.message === 'string') {
          msg = e.message;
        } else {
          // Last resort — JSON stringify for full visibility in logs
          msg = JSON.stringify(uploadErr);
        }
      } else if (uploadErr instanceof Error) {
        msg = uploadErr.message;
      }
      console.error('[uploadPaymentProof] Cloudinary error detail:', JSON.stringify(uploadErr));
      throw new Error(`Gagal mengunggah bukti pembayaran: ${msg}`);
    }

    return OrderRepository.uploadPaymentProof(orderId, uploadResult.secure_url, note);
  },

  async updateOrderStatus(adminId: string, id: string, status: OrderStatus, note?: string) {
    const order = await OrderRepository.findById(id);
    if (!order) {
      throw new NotFoundError('Order tidak ditemukan');
    }

    const updated = await OrderRepository.updateStatus(id, status, note);
    await AuditRepository.log(adminId, 'UPDATE_ORDER_STATUS', 'Order', id, { status, note });
    return updated;
  },
};

// ─── ADMIN SERVICE ───────────────────────────────────────────────────────────
export const AdminService = {
  async getDashboard(adminId: string) {
    const [orders, users, activeProducts, logs] = await Promise.all([
      OrderRepository.findAll(),
      UserRepository.findAll(),
      ProductRepository.findMany({ isActive: true, take: 1000 }),
      AuditRepository.getLogs(),
    ]);

    const totalRevenue = orders
      .filter((o) => o.status === 'PAID' || o.status === 'SHIPPED' || o.status === 'DELIVERED')
      .reduce((sum, o) => sum + o.totalPrice, 0);

    const pendingConfirmationCount = orders.filter((o) => o.status === 'WAITING_CONFIRMATION').length;

    return {
      stats: {
        totalOrders: orders.length,
        totalUsers: users.length,
        totalActiveProducts: activeProducts.length,
        totalRevenue,
        pendingConfirmationCount,
      },
      recentOrders: orders.slice(0, 10),
      recentLogs: logs,
    };
  },
};

// ─── UPLOAD SERVICE ──────────────────────────────────────────────────────────
export const UploadService = {
  async uploadFile(fileBuffer: Buffer, mimeType: string, folder = 'sneakerlocal/general') {
    const cld = getCloudinary();
    const base64File = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
    const result = await cld.uploader.upload(base64File, { folder, resource_type: 'image' });
    return { url: result.secure_url };
  },
};
