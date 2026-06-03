# TODO - Fix Home Page & Shop Store

## Step 1
- Update `src/store/shop.ts`:
  - Fix variable typos/undefined (`normalized` vs `normalizedProducts`, `rawProducts/rawCategories` vs real variables).
  - Ensure filtering logic compiles and returns correct `displayProducts`.
  - Ensure Zustand `set()` uses defined variables.

## Step 2
- Update `src/app/page.tsx`:
  - Replace direct `products` usage with Zustand store state (`products`, `displayProducts`, `fetchProducts`).
  - Trigger initial `fetchProducts()` on mount.
  - Render using `displayProducts` (filtered results).

## Step 3 (verification)
- Run dev/build to ensure no TS/runtime errors.
- Check homepage renders and filters respond to URL query params.

