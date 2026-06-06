/*
  Warnings:

  - You are about to drop the column `size` on the `ProductSKU` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[productId,color,sizeEU]` on the table `ProductSKU` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sizeEU` to the `ProductSKU` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ProductSKU_productId_color_size_key";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingCost" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "brandId" TEXT,
ADD COLUMN     "discount" INTEGER DEFAULT 0,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "skuCode" TEXT;

-- AlterTable
ALTER TABLE "ProductSKU" DROP COLUMN "size",
ADD COLUMN     "sizeCM" DOUBLE PRECISION,
ADD COLUMN     "sizeEU" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "sizeUK" TEXT,
ADD COLUMN     "sizeUS" TEXT;

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSKU_productId_color_sizeEU_key" ON "ProductSKU"("productId", "color", "sizeEU");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
