import {
  UserRepository,
  AddressRepository,
  ProductRepository,
  CategoryRepository,
  CartRepository,
  OrderRepository,
  SettingRepository,
  AuditRepository,
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

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
      ProductRepository.findMany({ ...params, skip, limit }),
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
      category: data.categoryId,
      brand: data.brandId,
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
      product: data.productId,
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
    const existing = await CategoryRepository.findBySlug(data.slug);
    if (existing) {
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
  async checkout(userId: string, data: any) {
    // 1. Calculate prices
    let subtotal = 0;
    const itemsToCreate = [];

    for (const item of data.items) {
      const sku = await ProductRepository.findSkuById(item.productSkuId);
      if (!sku) {
        throw new NotFoundError(`Varian SKU dengan ID ${item.productSkuId} tidak ditemukan`);
      }

      const stock = sku.inventory?.stock ?? 0;
      if (stock < item.quantity) {
        throw new ValidationError(`Stok tidak mencukupi untuk ${sku.product.name} (${sku.color}, ${sku.sizeEU})`);
      }

      const price = sku.price || sku.product.basePrice;
      subtotal += price * item.quantity;

      itemsToCreate.push({
        skuId: item.productSkuId,
        quantity: item.quantity,
        priceAtPurchase: price,
      });
    }

    // Get flat shipping fee or read from dynamic settings
    const shippingFeeSetting = await SettingRepository.get('shipping_fee');
    const shippingFee = data.shippingType === 'DELIVERY' ? Number(shippingFeeSetting ?? 20000) : 0;
    const totalPrice = subtotal + shippingFee;

    // Address construction
    let fullShippingAddress = data.shippingAddress || '';
    if (data.shippingAddressId) {
      const address = await AddressRepository.findById(data.shippingAddressId);
      if (address) {
        fullShippingAddress = `${address.recipientName} (${address.phoneNumber}) - ${address.fullAddress}, ${address.district || ''}, ${address.city || ''}, ${address.province || ''} ${address.postalCode || ''}`;
      }
    }

    // Payment expiry: 24 hours
    const paymentExpiresAt = new Date();
    paymentExpiresAt.setHours(paymentExpiresAt.getHours() + 24);

    const order = await OrderRepository.create(
      {
        userId,
        status: 'PENDING',
        shippingType: data.shippingType,
        shippingAddress: fullShippingAddress,
        shippingDistrict: data.shippingDistrict || null,
        shippingFee,
        shippingCost: shippingFee,
        subtotal,
        totalPrice,
        paymentMethod: data.paymentMethod,
        paymentExpiresAt,
        notes: data.notes || '',
      },
      itemsToCreate
    );

    // Clear user cart if checkout is successful
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

    // Upload to Cloudinary
    const base64File = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(base64File, {
      folder: 'sneakerlocal/payments',
    });

    return OrderRepository.uploadPaymentProof(orderId, result.secure_url);
  },

  async updateOrderStatus(adminId: string, id: string, status: any, note?: string) {
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
      ProductRepository.findMany({ isActive: true }),
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
    const base64File = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(base64File, { folder });
    return { url: result.secure_url };
  },
};
