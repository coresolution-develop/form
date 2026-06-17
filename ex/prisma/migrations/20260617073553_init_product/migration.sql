-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `price` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `memo` VARCHAR(191) NULL,
    `source` VARCHAR(191) NOT NULL DEFAULT 'sheet',
    `syncStatus` VARCHAR(191) NOT NULL DEFAULT 'synced',
    `computed` INTEGER NOT NULL DEFAULT 0,
    `rowIndex` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Product_source_idx`(`source`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
