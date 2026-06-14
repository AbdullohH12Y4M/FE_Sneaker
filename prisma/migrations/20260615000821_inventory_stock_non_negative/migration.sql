-- Migration: inventory_stock_non_negative
--
-- Purpose:
--   Add a CHECK constraint that prevents the `stock` column in the `Inventory`
--   table from ever going below zero at the database level.
--
--   This is the last line of defence against overselling bugs.  Even if
--   application-level code has a race condition or a logic error, the database
--   will reject any UPDATE that would produce a negative stock value and roll
--   back the entire transaction.
--
-- Safety:
--   The constraint is added with NOT VALID first, which means PostgreSQL will
--   NOT scan existing rows immediately (fast, zero-downtime on large tables).
--   The separate VALIDATE CONSTRAINT statement then verifies all existing rows
--   in a mode that only holds a SHARE UPDATE EXCLUSIVE lock — concurrent reads
--   and writes continue normally during validation.
--
--   If any existing row already has stock < 0, the VALIDATE step will fail and
--   the migration will be rolled back.  Fix the bad data first, then re-run.

-- Step 1: Add the constraint without scanning existing rows (non-blocking).
ALTER TABLE "Inventory"
  ADD CONSTRAINT "inventory_stock_non_negative"
  CHECK (stock >= 0)
  NOT VALID;

-- Step 2: Validate all existing rows (allows concurrent DML, no table lock).
ALTER TABLE "Inventory"
  VALIDATE CONSTRAINT "inventory_stock_non_negative";

-- ── Performance indexes added alongside this migration ────────────────────────
-- These were identified in the audit as missing indexes on high-traffic query
-- paths.  They are included here to keep schema improvements atomic.

-- Orders by user (used in every "my orders" query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Order_userId_idx"
  ON "Order" ("userId");

-- Orders by status (used in admin dashboard filters and order management)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Order_status_idx"
  ON "Order" ("status");

-- Cart items by cart (used in cart fetch and checkout)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "CartItem_cartId_idx"
  ON "CartItem" ("cartId");

-- Inventory movements by SKU (used in stock history views)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "InventoryMovement_skuId_idx"
  ON "InventoryMovement" ("skuId");

-- Audit log by actor and entity (used in admin audit views)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditLog_actorId_idx"
  ON "AuditLog" ("actorId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditLog_entity_entityId_idx"
  ON "AuditLog" ("entity", "entityId");

-- Addresses by user (used in profile and checkout address lookup)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Address_userId_idx"
  ON "Address" ("userId");
