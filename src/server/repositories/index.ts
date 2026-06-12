import { db } from '../database/db';
import { Prisma } from '@prisma/client';

// ─── USER REPOSITORY ─────────────────────────────────────────────────────────
export const UserRepository = {
  async findById(id: string) {
    return db.user.findFirst({
      where: { id, deletedAt: null },
    });
  },

  async findByEmail(email: string) {
    return db.user.findFirst({
      where: { email, deletedAt: null },
    });
  },

  async create(data: Prisma.UserCreateInput) {
    return db.user.create({ data });
  },

  async update(id: string, data: Prisma.UserUpdateInput) {
    return db.user.update({
      where: { id },
      data,
    });
  },

  async softDelete(id: string) {
    return db.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  async findAll() {
    return db.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  },
};

// ─── ADDRESS REPOSITORY ──────────────────────────────────────────────────────
export const AddressRepository = {
  async findById(id: string) {
    return db.address.findFirst({
      where: { id, deletedAt: null },
    });
  },

  async findByUserId(userId: string) {
    return db.address.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  },

  async create(data: Prisma.AddressUncheckedCreateInput) {
    if (data.isDefault) {
      await db.address.updateMany({
        where: { userId: data.userId },
        data: { isDefault: false },
      });
    }
    return db.address.create({ data });
  },

  async update(id: string, userId: string, data: Prisma.AddressUpdateInput) {
    if (data.isDefault) {
      await db.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return db.address.update({
      where: { id },
      data,
    });
  },

  async softDelete(id: string) {
    return db.address.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};

// ─── PRODUCT REPOSITORY ──────────────────────────────────────────────────────
export const ProductRepository = {
  async findById(id: string) {
    return db.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        brand: true,
        images: true,
        skus: {
          include: { inventory: true },
        },
      },
    });
  },

  async findBySlug(slug: string) {
    return db.product.findFirst({
      where: { slug, deletedAt: null },
      include: {
        category: true,
        brand: true,
        images: true,
        skus: {
          include: { inventory: true },
        },
      },
    });
  },

  async findBySlugOrId(slugOrId: string) {
    return db.product.findFirst({
      where: {
        OR: [{ slug: slugOrId }, { id: slugOrId }],
        deletedAt: null,
      },
      include: {
        category: true,
        brand: true,
        images: true,
        skus: {
          include: { inventory: true },
        },
      },
    });
  },

  async findMany(params: {
    q?: string;
    categorySlug?: string;
    brandSlug?: string;
    gender?: string;
    isActive?: boolean;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.ProductWhereInput = { deletedAt: null };

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }
    if (params.gender) {
      where.gender = params.gender;
    }
    if (params.categorySlug) {
      where.category = { slug: params.categorySlug, deletedAt: null };
    }
    if (params.brandSlug) {
      where.brand = { slug: params.brandSlug, isActive: true };
    }
    if (params.q) {
      where.OR = [
        { name: { contains: params.q, mode: 'insensitive' } },
        { description: { contains: params.q, mode: 'insensitive' } },
        { skuCode: { contains: params.q, mode: 'insensitive' } },
      ];
    }

    return db.product.findMany({
      where,
      skip: params.skip,
      take: params.take,
      include: {
        category: true,
        brand: true,
        images: true,
        skus: {
          include: { inventory: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async count(params: {
    q?: string;
    categorySlug?: string;
    brandSlug?: string;
    gender?: string;
    isActive?: boolean;
  }) {
    const where: Prisma.ProductWhereInput = { deletedAt: null };
    if (params.isActive !== undefined) where.isActive = params.isActive;
    if (params.gender) where.gender = params.gender;
    if (params.categorySlug) where.category = { slug: params.categorySlug, deletedAt: null };
    if (params.brandSlug) where.brand = { slug: params.brandSlug, isActive: true };
    if (params.q) {
      where.OR = [
        { name: { contains: params.q, mode: 'insensitive' } },
        { description: { contains: params.q, mode: 'insensitive' } },
        { skuCode: { contains: params.q, mode: 'insensitive' } },
      ];
    }
    return db.product.count({ where });
  },

  async create(data: Prisma.ProductCreateInput) {
    return db.product.create({ data });
  },

  async update(id: string, data: Prisma.ProductUpdateInput) {
    return db.product.update({
      where: { id },
      data,
    });
  },

  async softDelete(id: string) {
    return db.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  // SKU Management
  async findSkuById(skuId: string) {
    return db.productSKU.findUnique({
      where: { id: skuId },
      include: { inventory: true, product: true },
    });
  },

  async createSku(data: Prisma.ProductSKUCreateInput) {
    return db.productSKU.create({ data });
  },

  async updateSku(skuId: string, data: Prisma.ProductSKUUpdateInput) {
    return db.productSKU.update({
      where: { id: skuId },
      data,
    });
  },

  async deleteSku(skuId: string) {
    return db.productSKU.delete({
      where: { id: skuId },
    });
  },

  // Inventory Management
  async updateStock(skuId: string, quantity: number, type: string, note?: string) {
    return db.$transaction(async (tx) => {
      const inventory = await tx.inventory.upsert({
        where: { skuId },
        update: { stock: quantity },
        create: { skuId, stock: quantity },
      });

      await tx.inventoryMovement.create({
        data: {
          skuId,
          quantity,
          type,
          note,
        },
      });

      return inventory;
    });
  },

  async adjustStock(skuId: string, diff: number, type: string, note?: string) {
    return db.$transaction(async (tx) => {
      const existing = await tx.inventory.findUnique({ where: { skuId } });
      const currentStock = existing?.stock ?? 0;
      const newStock = currentStock + diff;

      const inventory = await tx.inventory.upsert({
        where: { skuId },
        update: { stock: newStock },
        create: { skuId, stock: newStock },
      });

      await tx.inventoryMovement.create({
        data: {
          skuId,
          quantity: diff,
          type,
          note,
        },
      });

      return inventory;
    });
  },
};

// ─── CATEGORY REPOSITORY ────────────────────────────────────────────────────
export const CategoryRepository = {
  async findById(id: string) {
    return db.category.findFirst({
      where: { id, deletedAt: null },
    });
  },

  async findBySlug(slug: string) {
    return db.category.findFirst({
      where: { slug, deletedAt: null },
    });
  },

  async findAll(params?: { isActive?: boolean }) {
    const where: Prisma.CategoryWhereInput = { deletedAt: null };
    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }
    return db.category.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  },

  async create(data: Prisma.CategoryCreateInput) {
    return db.category.create({ data });
  },

  async update(id: string, data: Prisma.CategoryUpdateInput) {
    return db.category.update({
      where: { id },
      data,
    });
  },

  async softDelete(id: string) {
    return db.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};

// ─── CART REPOSITORY ─────────────────────────────────────────────────────────
export const CartRepository = {
  async findByUserId(userId: string) {
    return db.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            sku: {
              include: {
                product: {
                  include: { images: true },
                },
                inventory: true,
              },
            },
          },
        },
      },
    });
  },

  async getOrCreateCart(userId: string) {
    let cart = await db.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await db.cart.create({ data: { userId } });
    }
    return cart;
  },

  async addItem(cartId: string, productSkuId: string, quantity: number) {
    return db.cartItem.upsert({
      where: {
        cartId_productSkuId: { cartId, productSkuId },
      },
      update: {
        quantity: { increment: quantity },
      },
      create: {
        cartId,
        productSkuId,
        quantity,
      },
    });
  },

  async updateItemQuantity(cartId: string, productSkuId: string, quantity: number) {
    return db.cartItem.update({
      where: {
        cartId_productSkuId: { cartId, productSkuId },
      },
      data: { quantity },
    });
  },

  async removeItem(cartId: string, productSkuId: string) {
    return db.cartItem.delete({
      where: {
        cartId_productSkuId: { cartId, productSkuId },
      },
    });
  },

  async clearCart(cartId: string) {
    return db.cartItem.deleteMany({
      where: { cartId },
    });
  },
};

// ─── ORDER REPOSITORY ────────────────────────────────────────────────────────
export const OrderRepository = {
  async findById(id: string) {
    return db.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            sku: {
              include: { product: true },
            },
          },
        },
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });
  },

  async findByUserId(userId: string) {
    return db.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            sku: {
              include: { product: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findAll() {
    return db.order.findMany({
      include: {
        user: { select: { id: true, email: true, name: true } },
        items: {
          include: {
            sku: { include: { product: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(orderData: Prisma.OrderUncheckedCreateInput, items: Prisma.OrderItemUncheckedCreateWithoutOrderInput[]) {
    return db.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: {
          ...orderData,
          items: {
            create: items,
          },
        },
      });

      // Deduct stock and log movements
      for (const item of items) {
        const existing = await tx.inventory.findUnique({ where: { skuId: item.skuId } });
        if (!existing || existing.stock < item.quantity) {
          throw new Error(`Stok tidak mencukupi untuk SKU ID: ${item.skuId}`);
        }

        await tx.inventory.update({
          where: { skuId: item.skuId },
          data: { stock: { decrement: item.quantity } },
        });

        await tx.inventoryMovement.create({
          data: {
            skuId: item.skuId,
            quantity: -item.quantity,
            type: 'PURCHASE',
            note: `Pembelian dari Order #${order.id}`,
          },
        });
      }

      return order;
    });
  },

  async updateStatus(id: string, status: any, note?: string) {
    return db.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id },
        data: { status, notes: note ? note : undefined },
      });

      // If cancelled, restore inventory stock
      if (status === 'CANCELLED') {
        const orderItems = await tx.orderItem.findMany({ where: { orderId: id } });
        for (const item of orderItems) {
          await tx.inventory.upsert({
            where: { skuId: item.skuId },
            update: { stock: { increment: item.quantity } },
            create: { skuId: item.skuId, stock: item.quantity },
          });

          await tx.inventoryMovement.create({
            data: {
              skuId: item.skuId,
              quantity: item.quantity,
              type: 'RETURN',
              note: `Pembatalan Order #${id}`,
            },
          });
        }
      }

      return order;
    });
  },

  async uploadPaymentProof(id: string, proofUrl: string) {
    return db.order.update({
      where: { id },
      data: {
        paymentProofUrl: proofUrl,
        status: 'WAITING_CONFIRMATION',
      },
    });
  },
};

// ─── SETTINGS REPOSITORY ─────────────────────────────────────────────────────
export const SettingRepository = {
  async get(key: string): Promise<string | null> {
    const setting = await db.appSetting.findUnique({ where: { key } });
    return setting ? setting.value : null;
  },

  async set(key: string, value: string) {
    return db.appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  },

  async getAll() {
    return db.appSetting.findMany();
  },
};

// ─── AUDIT REPOSITORY ────────────────────────────────────────────────────────
export const AuditRepository = {
  async log(actorId: string, action: string, entity: string, entityId?: string, metadata?: any) {
    return db.auditLog.create({
      data: {
        actorId,
        action,
        entity,
        entityId,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  },

  async getLogs() {
    return db.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  },
};
