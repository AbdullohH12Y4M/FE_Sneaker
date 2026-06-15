import type { Order, Product, ProductSKU } from '@/types';
import { ordersApi, productsApi } from './api';
import { isMockApiEnabled } from './mock-api/config';

// ─── List parsing ─────────────────────────────────────────────────────────────

export function parseListPayload<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.products)) return obj.products as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
  }
  return [];
}

// ─── SKU normalizer ───────────────────────────────────────────────────────────

export function normalizeSku(sku: Record<string, unknown>): ProductSKU {
  return {
    id: String(sku.id ?? ''),
    productId: String(sku.productId ?? ''),
    color: String(sku.color ?? ''),
    colorHex: String(sku.colorHex ?? '#888888'),
    sizeEU: Number(sku.sizeEU ?? sku.size ?? 0), // fallback to old `size` for compat
    sizeUS: sku.sizeUS ? String(sku.sizeUS) : undefined,
    sizeUK: sku.sizeUK ? String(sku.sizeUK) : undefined,
    sizeCM: sku.sizeCM != null ? Number(sku.sizeCM) : undefined,
    stock:
      typeof sku.stock === 'number'
        ? sku.stock
        : ((sku.inventory as { stock?: number } | undefined)?.stock ?? 0),
    price: sku.price != null ? Number(sku.price) : undefined,
  };
}

// ─── Product normalizer ───────────────────────────────────────────────────────

export function normalizeProductCategory(category: unknown): string {
  if (typeof category === 'string') return category;
  if (category && typeof category === 'object') {
    const c = category as { name?: string; slug?: string };
    return c.name ?? c.slug ?? 'Uncategorized';
  }
  return 'Uncategorized';
}

export function normalizeProductBrand(brand: unknown): string {
  if (typeof brand === 'string') return brand;
  if (brand && typeof brand === 'object') {
    const b = brand as { name?: string; slug?: string };
    return b.name ?? b.slug ?? 'Unknown Brand';
  }
  return 'Unknown Brand';
}

export function normalizeProduct(product: Record<string, unknown>): Product {
  const rawSkus = Array.isArray(product.skus)
    ? (product.skus as Record<string, unknown>[])
    : [];
  const skus = rawSkus.map(normalizeSku);

  // ─── Images: preserve full ProductImage object (id + url + isPrimary) ──────
  // Root-cause fix for Issue #5: previously we stripped images to string[],
  // discarding the `id` field. This forced handleDeleteImage to perform an
  // extra API round-trip just to get the imageId. By keeping the full object
  // we enable direct delete without a double-fetch.
  let images: import('@/types').ProductImage[] = [];
  if (Array.isArray(product.images) && product.images.length > 0) {
    const first = product.images[0];
    if (typeof first === 'string') {
      // Legacy shape: string[] — wrap into ProductImage objects with no id
      images = (product.images as string[]).map((url, i) => ({
        id: '',          // no id available from legacy shape
        productId: String(product.id ?? ''),
        url,
        isPrimary: i === 0,
        createdAt: '',
      }));
    } else if (typeof first === 'object' && first !== null) {
      // Current shape: ProductImage[] — map directly
      images = (product.images as Record<string, unknown>[]).map((img) => ({
        id: String(img.id ?? ''),
        productId: String(img.productId ?? product.id ?? ''),
        url: String(img.url ?? ''),
        isPrimary: Boolean(img.isPrimary ?? false),
        createdAt: String(img.createdAt ?? ''),
      }));
    }
  }

  return {
    ...(product as unknown as Product),
    id: String(product.id ?? ''),
    name: String(product.name ?? ''),
    slug: String(product.slug ?? ''),
    skuCode: String(product.skuCode ?? ''),
    description: String(product.description ?? ''),
    basePrice: Number(product.basePrice ?? 0),
    gender: (product.gender as Product['gender']) ?? 'UNISEX',
    releaseYear: product.releaseYear ? Number(product.releaseYear) : undefined,
    isActive: Boolean(product.isActive ?? true),
    categoryId: String(product.categoryId ?? ''),
    brandId: String(product.brandId ?? ''),
    category: normalizeProductCategory(product.category),
    brand: normalizeProductBrand(product.brand),
    images,
    skus,
  };
}

// ─── Order normalizer ─────────────────────────────────────────────────────────

export function normalizeOrderItem(item: Record<string, unknown>) {
  const unitPrice =
    typeof item.priceAtPurchase === 'number'
      ? item.priceAtPurchase
      : typeof item.price === 'number'
        ? item.price
        : 0;
  const sku = item.sku as Record<string, unknown> | undefined;

  return {
    ...item,
    id: String(item.id ?? ''),
    skuId: String(item.skuId ?? ''),
    quantity: Number(item.quantity ?? 0),
    priceAtPurchase: unitPrice,
    sku: sku
      ? {
          ...normalizeSku(sku),
          product: sku.product
            ? normalizeProduct(sku.product as Record<string, unknown>)
            : undefined,
        }
      : undefined,
  };
}

export function normalizeOrder(order: Record<string, unknown>): Order {
  const rawItems = Array.isArray(order.items)
    ? (order.items as Record<string, unknown>[])
    : [];

  return {
    ...(order as unknown as Order),
    items: rawItems.map((item) => normalizeOrderItem(item)) as Order['items'],
    subtotal:
      typeof order.subtotal === 'number'
        ? order.subtotal
        : 0,
    totalPrice:
      typeof order.totalPrice === 'number'
        ? order.totalPrice
        : typeof order.total === 'number'
          ? order.total
          : 0,
    shippingFee:
      typeof order.shippingFee === 'number'
        ? order.shippingFee
        : typeof order.shippingCost === 'number'
          ? order.shippingCost
          : 0,
    shippingDistrict:
      (order.shippingDistrict as string | undefined) ??
      (order.district as string | undefined),
    paymentExpiresAt:
      (order.paymentExpiresAt as string | undefined) ??
      (order.paymentDeadline as string | undefined),
  };
}

export function parseOrdersList(data: unknown): Order[] {
  return parseListPayload<Record<string, unknown>>(data).map(normalizeOrder);
}

export function parseProductsList(data: unknown): Product[] {
  return parseListPayload<Record<string, unknown>>(data).map(normalizeProduct);
}

// ─── Receipt download ─────────────────────────────────────────────────────────

export async function downloadOrderReceipt(orderId: string): Promise<void> {
  const res = await ordersApi.downloadReceipt(orderId);
  const blob =
    res.data instanceof Blob
      ? res.data
      : new Blob([res.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `struk-${orderId}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// ─── Admin helper: products with SKUs ────────────────────────────────────────

/**
 * Load all products with SKUs for admin pages.
 * Uses /api/products/all which includes skus + brand + images in one request.
 */
export async function fetchAdminProductsWithSkus(): Promise<Product[]> {
  const res = await productsApi.listCatalog();
  return parseProductsList(res.data);
}
