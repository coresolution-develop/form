-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "memo" TEXT,
    "source" TEXT NOT NULL DEFAULT 'sheet',
    "syncStatus" TEXT NOT NULL DEFAULT 'synced',
    "computed" INTEGER NOT NULL DEFAULT 0,
    "rowIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_source_idx" ON "Product"("source");
