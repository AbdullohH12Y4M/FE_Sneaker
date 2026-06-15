import { findMockUserByCredentials, parseMockToken, createMockAccessToken } from '@/data/mockUsers';
import type { MockProductRecord } from '@/data/mockCatalog';
import { getMockState, setMockState, nextId, type MockOrderRecord } from './store';

const SHIPPING_FEES: Record<string, number> = {
  LOWOKWARU: 10000,
  KLOJEN: 10000,
  BLIMBING: 12000,
  SUKUN: 12000,
  KEDUNGKANDANG: 15000,
};

function ok<T>(data: T, status = 200) {
  return Promise.resolve({ data, status, statusText: 'OK', headers: {}, config: {} as never });
}

function fail(message: string, status = 400) {
  const error = new Error(message) as Error & {
    response?: { data: { message: string }; status: number };
  };
  error.response = { data: { message }, status };
  return Promise.reject(error);
}

function getBearerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

function requireUser(roles?: Array<'ADMIN' | 'CUSTOMER'>) {
  const user = parseMockToken(getBearerToken());
  if (!user) {
    return fail('Unauthorized', 401);
  }
  if (roles && !roles.includes(user.role)) {
    return fail('Forbidden', 403);
  }
  return Promise.resolve(user);
}

function withInventory(skus: MockProductRecord['skus']) {
  return skus.map((sku) => ({ ...sku, inventory: { stock: sku.stock } }));
}

function enrichProduct(p: MockProductRecord) {
  const state = getMockState();
  const category = state.categories.find((c) => c.id === p.categoryId) ?? p.category;
  // Build images: use stored ProductImage objects; fallback to imageUrl if images is empty
  let images: MockProductRecord['images'] = p.images?.length ? p.images : [];
  if (!images.length && p.imageUrl) {
    images = [{
      id: `img-${p.id}-fallback`,
      productId: p.id,
      url: p.imageUrl,
      isPrimary: true,
      createdAt: '',
    }];
  }
  return {
    ...p,
    category,
    images,
    skus: withInventory(p.skus),
  };
}

function filterProducts(products: MockProductRecord[], params?: Record<string, unknown>) {
  let list = products.filter((p) => p.isActive);
  const q = String(params?.q ?? params?.search ?? '').toLowerCase();
  const categorySlug = String(params?.categorySlug ?? params?.category ?? '').toLowerCase();
  const color = String(params?.color ?? '');
  const size = params?.size ? Number(params.size) : 0;
  const minPrice = params?.minPrice ? Number(params.minPrice) : 0;
  const maxPrice = params?.maxPrice ? Number(params.maxPrice) : 0;

  if (categorySlug) {
    list = list.filter(
      (p) =>
        p.category.slug.toLowerCase() === categorySlug ||
        p.category.name.toLowerCase() === categorySlug
    );
  }
  if (q) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }
  return list.filter((p) => {
    const skus = p.skus.filter((s) => s.stock > 0);
    if (!skus.length) return false;
    if (color && !skus.some((s) => s.color.toLowerCase() === color.toLowerCase())) return false;
    if (size && !skus.some((s) => s.sizeEU === size)) return false;
    if (minPrice && !skus.some((s) => (s.price ?? p.basePrice) >= minPrice)) return false;
    if (maxPrice && maxPrice > 0 && !skus.some((s) => (s.price ?? p.basePrice) <= maxPrice)) return false;
    return true;
  });
}

function paginate<T>(items: T[], params?: Record<string, unknown>) {
  const page = Number(params?.page ?? 1);
  const limit = Number(params?.limit ?? 20);
  const start = (page - 1) * limit;
  return { page, limit, total: items.length, items: items.slice(start, start + limit) };
}

function buildOrderItems(items: Array<{ skuId: string; quantity: number }>) {
  const state = getMockState();
  const orderItems: MockOrderRecord['items'] = [];
  let subtotal = 0;

  for (const line of items) {
    const sku = state.products.flatMap((p) => p.skus).find((s) => s.id === line.skuId);
    if (!sku) throw new Error(`SKU ${line.skuId} not found`);
    const product = state.products.find((p) => p.id === sku.productId);
    if (!product?.isActive) throw new Error('Product not active');
    if (sku.stock < line.quantity) throw new Error(`Stok tidak cukup untuk ${sku.color} EU ${sku.sizeEU}`);

    const price = sku.price ?? product.basePrice;
    subtotal += price * line.quantity;
    orderItems.push({
      id: nextId('oi'),
      orderId: '',
      skuId: sku.id,
      quantity: line.quantity,
      price,
      priceAtPurchase: price,
      sku: { ...sku, product: enrichProduct(product) },
    });
  }
  return { orderItems, subtotal };
}

export const mockHandlers = {
  getHello: () => ok({ message: 'SneakerLocal Mock API — development mode' }),

  login: (body: { email: string; password: string }) => {
    const state = getMockState();
    const registered = state.users.find(
      (u) => u.email.toLowerCase() === body.email.toLowerCase() && u.password === body.password
    );
    const staticUser = findMockUserByCredentials(body.email, body.password);
    const user = registered ?? staticUser;
    if (!user) return fail('Email atau password salah', 401);
    return ok({
      access_token: createMockAccessToken(user.id),
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  },

  registerCustomer: (body: { email: string; password: string }) => {
    const state = getMockState();
    if (state.users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) {
      return fail('Email sudah terdaftar');
    }
    const user = {
      id: nextId('usr'),
      name: body.email.split('@')[0],
      email: body.email,
      password: body.password,
      role: 'CUSTOMER' as const,
      createdAt: new Date().toISOString(),
    };
    state.users.push(user);
    setMockState(state);
    return ok({ user: { id: user.id, email: user.email, role: user.role } }, 201);
  },

  registerAdmin: async (body: { email: string; password: string }) => {
    await requireUser(['ADMIN']);
    const state = getMockState();
    if (state.users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) {
      return fail('Email sudah terdaftar');
    }
    const user = {
      id: nextId('usr'),
      name: body.email.split('@')[0],
      email: body.email,
      password: body.password,
      role: 'ADMIN' as const,
      createdAt: new Date().toISOString(),
    };
    state.users.push(user);
    setMockState(state);
    return ok({ user: { id: user.id, email: user.email, role: user.role } }, 201);
  },

  getAllUsers: async () => {
    await requireUser(['ADMIN']);
    const state = getMockState();
    return ok(
      state.users.map(({ password: _p, ...u }) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
      }))
    );
  },

  listProducts: (params?: Record<string, unknown>) => {
    const state = getMockState();
    const filtered = filterProducts(state.products, params).map(enrichProduct);
    return ok(paginate(filtered, params));
  },

  listCatalog: () => {
    const state = getMockState();
    return ok({
      products: state.products.filter((p) => p.isActive).map(enrichProduct),
      categories: state.categories.filter((c) => c.isActive),
    });
  },

  getProductBySlug: (slug: string) => {
    const product = getMockState().products.find((p) => p.slug === slug && p.isActive);
    if (!product) return fail('Product not found', 404);
    return ok(enrichProduct(product));
  },

  createProduct: async (body: Record<string, unknown>) => {
    await requireUser(['ADMIN']);
    const state = getMockState();

    if (body.type === 'SKU') {
      const product = state.products.find((p) => p.id === String(body.productId));
      if (!product) return fail('Product not found', 404);
      const sku = {
        id: nextId('sku'),
        productId: product.id,
        color: String(body.color),
        colorHex: String(body.colorHex ?? '#888888'),
        sizeEU: Number(body.sizeEU ?? body.size),
        sizeUS: body.sizeUS ? String(body.sizeUS) : undefined,
        sizeUK: body.sizeUK ? String(body.sizeUK) : undefined,
        sizeCM: body.sizeCM ? Number(body.sizeCM) : undefined,
        stock: Number(body.stock ?? body.initialStock ?? 0),
        price: body.price ? Number(body.price) : undefined,
      };
      product.skus.push(sku);
      setMockState(state);
      return ok(sku, 201);
    }

    const category = state.categories.find((c) => c.id === String(body.categoryId));
    if (!category) return fail('Category not found');

    const product: MockProductRecord = {
      id: nextId('prod'),
      categoryId: category.id,
      name: String(body.name),
      slug: String(body.slug),
      description: String(body.description ?? ''),
      basePrice: Number(body.basePrice),
      imageUrl: body.imageUrl ? String(body.imageUrl) : undefined,
      isActive: body.isActive !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category,
      images: body.imageUrl
        ? [{ id: nextId('img'), productId: '', url: String(body.imageUrl), isPrimary: true, createdAt: new Date().toISOString() }]
        : [],
      skus: [],
    };
    state.products.unshift(product);
    setMockState(state);
    return ok(product, 201);
  },

  updateProduct: async (id: string, body: Record<string, unknown>) => {
    await requireUser(['ADMIN']);
    const state = getMockState();
    const product = state.products.find((p) => p.id === id);
    if (!product) return fail('Product not found', 404);
    if (body.name) product.name = String(body.name);
    if (body.description !== undefined) product.description = String(body.description);
    if (body.basePrice !== undefined) product.basePrice = Number(body.basePrice);
    if (body.isActive !== undefined) product.isActive = Boolean(body.isActive);
    if (body.categoryId) {
      product.categoryId = String(body.categoryId);
      product.category = state.categories.find((c) => c.id === product.categoryId) ?? product.category;
    }
    product.updatedAt = new Date().toISOString();
    setMockState(state);
    return ok(enrichProduct(product));
  },

  deleteProduct: async (id: string) => {
    await requireUser(['ADMIN']);
    const state = getMockState();
    const idx = state.products.findIndex((p) => p.id === id);
    if (idx < 0) return fail('Product not found', 404);
    state.products.splice(idx, 1);
    setMockState(state);
    return ok({ success: true });
  },

  updateSku: async (id: string, body: Record<string, unknown>) => {
    await requireUser(['ADMIN']);
    const state = getMockState();
    for (const product of state.products) {
      const sku = product.skus.find((s) => s.id === id);
      if (!sku) continue;
      if (body.color) sku.color = String(body.color);
      if (body.colorHex) sku.colorHex = String(body.colorHex);
      if (body.sizeEU !== undefined) sku.sizeEU = Number(body.sizeEU);
      if (body.sizeUS !== undefined) sku.sizeUS = String(body.sizeUS);
      if (body.sizeUK !== undefined) sku.sizeUK = String(body.sizeUK);
      if (body.sizeCM !== undefined) sku.sizeCM = Number(body.sizeCM);
      if (body.stock !== undefined) sku.stock = Number(body.stock);
      if (body.price !== undefined) sku.price = Number(body.price);
      setMockState(state);
      return ok({ ...sku });
    }
    return fail('SKU not found', 404);
  },

  updateStock: async (skuId: string, body: { stock: number }) => {
    await requireUser(['ADMIN']);
    const state = getMockState();
    for (const product of state.products) {
      const sku = product.skus.find((s) => s.id === skuId);
      if (!sku) continue;
      sku.stock = Number(body.stock);
      setMockState(state);
      return ok({ skuId, stock: sku.stock });
    }
    return fail('SKU not found', 404);
  },

  uploadProductImage: async (id: string) => {
    await requireUser(['ADMIN']);
    const state = getMockState();
    const product = state.products.find((p) => p.id === id);
    if (!product) return fail('Product not found', 404);
    const url = `https://placehold.co/600x600/1a1a24/f97316?text=${encodeURIComponent(product.name)}`;
    const imageId = nextId('img');
    const newImage = { id: imageId, productId: id, url, isPrimary: product.images.length === 0, createdAt: new Date().toISOString() };
    product.imageUrl = url;
    product.images = [...product.images, newImage];
    setMockState(state);
    return ok({ imageUrl: url, productImage: newImage });
  },

  listBrands: (params?: Record<string, unknown>) => {
    const state = getMockState();
    let items = state.brands ?? [];
    const q = String(params?.q ?? '').toLowerCase();
    const isActiveParam = params?.isActive;
    if (isActiveParam !== undefined) items = items.filter((b) => b.isActive === (isActiveParam === 'true'));
    if (q) items = items.filter((b) => b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q));
    return ok(paginate(items, params));
  },

  getBrand: (id: string) => {
    const brand = getMockState().brands?.find((b) => b.id === id);
    if (!brand) return fail('Brand not found', 404);
    return ok(brand);
  },

  createBrand: async (body: { name: string; slug: string; logoUrl?: string }) => {
    await requireUser(['ADMIN']);
    const state = getMockState();
    if (!state.brands) state.brands = [];
    if (state.brands.some((b) => b.slug === body.slug)) return fail('Slug sudah ada');
    const brand = {
      id: nextId('brand'),
      name: body.name,
      slug: body.slug,
      logoUrl: body.logoUrl ?? null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.brands.push(brand);
    setMockState(state);
    return ok(brand, 201);
  },

  updateBrand: async (id: string, body: Record<string, unknown>) => {
    await requireUser(['ADMIN']);
    const state = getMockState();
    const brand = state.brands?.find((b) => b.id === id);
    if (!brand) return fail('Brand not found', 404);
    if (body.name) brand.name = String(body.name);
    if (body.slug && body.slug !== brand.slug) {
      if (state.brands?.some((b) => b.slug === body.slug)) return fail('Slog sudah digunakan');
      brand.slug = String(body.slug);
    }
    if (body.logoUrl !== undefined) brand.logoUrl = String(body.logoUrl);
    if (body.isActive !== undefined) brand.isActive = Boolean(body.isActive);
    brand.updatedAt = new Date().toISOString();
    setMockState(state);
    return ok(brand);
  },

  deleteBrand: async (id: string) => {
    await requireUser(['ADMIN']);
    const state = getMockState();
    if (!state.brands?.some((b) => b.id === id)) return fail('Brand not found', 404);
    state.brands = state.brands.filter((b) => b.id !== id);
    setMockState(state);
    return ok({ success: true });
  },

  listCategories: (params?: Record<string, unknown>) => {
    const items = getMockState().categories.filter((c) => c.isActive);
    return ok(paginate(items, params));
  },

  getCategory: (id: string) => {
    const cat = getMockState().categories.find((c) => c.id === id);
    if (!cat) return fail('Category not found', 404);
    return ok(cat);
  },

  createCategory: async (body: { name: string; slug: string }) => {
    await requireUser(['ADMIN']);
    const state = getMockState();
    if (state.categories.some((c) => c.slug === body.slug)) return fail('Slug sudah ada');
    const cat = {
      id: nextId('cat'),
      name: body.name,
      slug: body.slug,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.categories.push(cat);
    setMockState(state);
    return ok(cat, 201);
  },

  updateCategory: async (id: string, body: Record<string, unknown>) => {
    await requireUser(['ADMIN']);
    const state = getMockState();
    const cat = state.categories.find((c) => c.id === id);
    if (!cat) return fail('Category not found', 404);
    if (body.name) cat.name = String(body.name);
    if (body.slug) cat.slug = String(body.slug);
    cat.updatedAt = new Date().toISOString();
    setMockState(state);
    return ok(cat);
  },

  deleteCategory: async (id: string) => {
    await requireUser(['ADMIN']);
    const state = getMockState();
    const idx = state.categories.findIndex((c) => c.id === id);
    if (idx < 0) return fail('Category not found', 404);
    state.categories.splice(idx, 1);
    setMockState(state);
    return ok({ success: true });
  },

  checkout: async (body: Record<string, unknown>) => {
    const user = await requireUser(['CUSTOMER']);
    const state = getMockState();
    const lines = body.items as Array<{ skuId: string; quantity: number }>;
    if (!lines?.length) return fail('items is required');

    try {
      const { orderItems, subtotal } = buildOrderItems(lines);
      const shippingType = body.shippingType as 'DELIVERY' | 'PICKUP';
      const district = body.district ? String(body.district) : undefined;
      const shippingFee =
        shippingType === 'DELIVERY' ? SHIPPING_FEES[district ?? 'LOWOKWARU'] ?? 10000 : 0;

      for (const line of lines) {
        const sku = state.products.flatMap((p) => p.skus).find((s) => s.id === line.skuId)!;
        sku.stock -= line.quantity;
      }

      const orderId = nextId('ord');
      const now = new Date();
      const order: MockOrderRecord = {
        id: orderId,
        userId: user.id,
        status: 'PENDING',
        shippingType,
        district,
        shippingAddress: body.shippingAddress ? String(body.shippingAddress) : undefined,
        shippingFee,
        subtotal,
        total: subtotal + shippingFee,
        paymentMethod: String(body.paymentMethod ?? 'MANUAL_TRANSFER'),
        paymentExpiresAt: new Date(now.getTime() + 3600000).toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        user: { id: user.id, email: user.email, name: user.name },
        items: orderItems.map((i) => ({ ...i, orderId })),
      };
      state.orders.unshift(order);
      setMockState(state);
      return ok(order, 201);
    } catch (e: unknown) {
      return fail(e instanceof Error ? e.message : 'Checkout failed');
    }
  },

  listMyOrders: async (params?: Record<string, unknown>) => {
    const user = await requireUser();
    let orders = getMockState().orders.filter((o) => o.userId === user.id);
    if (params?.status) orders = orders.filter((o) => o.status === params.status);
    return ok(paginate(orders, params));
  },

  listAllOrders: async (params?: Record<string, unknown>) => {
    await requireUser(['ADMIN']);
    let orders = [...getMockState().orders];
    if (params?.status) orders = orders.filter((o) => o.status === params.status);
    return ok(paginate(orders, params));
  },

  getOrder: async (id: string) => {
    const user = await requireUser();
    const order = getMockState().orders.find((o) => o.id === id);
    if (!order) return fail('Order not found', 404);
    if (user.role !== 'ADMIN' && order.userId !== user.id) return fail('Forbidden', 403);
    return ok(order);
  },

  uploadPaymentProof: async (orderId: string) => {
    const user = await requireUser();
    const state = getMockState();
    const order = state.orders.find((o) => o.id === orderId);
    if (!order) return fail('Order not found', 404);
    if (order.userId !== user.id) return fail('Forbidden', 403);
    if (order.status !== 'PENDING') return fail('Only PENDING orders can upload payment proof');
    order.paymentProofUrl = `https://placehold.co/400x600/16a34a/ffffff?text=Bukti+${orderId.slice(-6)}`;
    order.paymentProofUploadedAt = new Date().toISOString();
    order.status = 'WAITING_CONFIRMATION';
    order.updatedAt = new Date().toISOString();
    setMockState(state);
    return ok(order);
  },

  updateOrderStatus: async (id: string, body: { status: string }) => {
    await requireUser(['ADMIN']);
    const state = getMockState();
    const order = state.orders.find((o) => o.id === id);
    if (!order) return fail('Order not found', 404);
    order.status = body.status;
    order.updatedAt = new Date().toISOString();
    if (body.status === 'CANCELLED') {
      for (const item of order.items) {
        const sku = state.products.flatMap((p) => p.skus).find((s) => s.id === item.skuId);
        if (sku) sku.stock += item.quantity;
      }
    }
    setMockState(state);
    return ok(order);
  },

  deleteOrder: async (id: string) => {
    const user = await requireUser();
    const state = getMockState();
    const order = state.orders.find((o) => o.id === id);
    if (!order) return fail('Order not found', 404);
    if (user.role !== 'ADMIN' && order.userId !== user.id) return fail('Forbidden', 403);
    if (order.status !== 'PENDING') return fail('Order hanya bisa dibatalkan saat status PENDING');
    order.status = 'CANCELLED';
    for (const item of order.items) {
      const sku = state.products.flatMap((p) => p.skus).find((s) => s.id === item.skuId);
      if (sku) sku.stock += item.quantity;
    }
    setMockState(state);
    return ok({ success: true, message: 'Order berhasil dibatalkan', data: order });
  },

  downloadReceipt: async (id: string) => {
    await requireUser();
    const blob = new Blob([`Struk Mock SneakerLocal\nOrder: ${id}`], { type: 'application/pdf' });
    return ok(blob);
  },

  exportOrders: async (format: string, status?: string) => {
    await requireUser(['ADMIN']);
    const state = getMockState();
    let orders = [...state.orders];
    if (status) orders = orders.filter((o) => o.status === status);

    if (format === 'csv') {
      const rows = orders.flatMap((o) =>
        o.items.map((i) => [
          o.id,
          o.user?.email ?? '-',
          o.user?.name ?? '-',
          o.status,
          new Date(o.createdAt).toLocaleDateString('id-ID'),
          o.subtotal,
          o.shippingFee,
          o.total,
          o.shippingType,
          o.paymentMethod,
          o.district ?? '-',
          i.sku.product.name,
          i.sku.color,
          i.sku.sizeEU,
          i.quantity,
          i.price,
        ].join(','))
      );
      const csvContent = ['id,email,name,status,date,subtotal,shippingFee,total,shippingType,paymentMethod,district,product,color,sizeEU,qty,price', ...rows].join('\n');
      return ok(csvContent, 200);
    } else if (format === 'json') {
      const data = orders.map((o) => ({
        id: o.id,
        email: o.user?.email ?? '-',
        name: o.user?.name ?? '-',
        status: o.status,
        date: o.createdAt,
        total: o.total,
        items: o.items.map((i) => ({
          product: i.sku.product.name,
          color: i.sku.color,
          sizeEU: i.sku.sizeEU,
          quantity: i.quantity,
          price: i.price,
        })),
      }));
      return ok(JSON.stringify(data, null, 2), 200);
    }
    return fail('Unsupported format', 400);
  },
};
