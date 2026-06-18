-- 멀티테넌트 전환: Org(테넌트) 도입 + 4개 모델에 orgId 스코프.
-- 순서가 핵심 — Org+기본행 먼저 → orgId nullable 추가 → 백필 → NOT NULL → 복합 PK 스왑 → 인덱스/FK → 싱글톤 제거.

-- 1. Org (테넌트) 테이블
CREATE TABLE `Org` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sheetId` VARCHAR(191) NOT NULL DEFAULT '',
    `gridTabPrefix` VARCHAR(191) NOT NULL DEFAULT '근무표',
    `settingsTab` VARCHAR(191) NOT NULL DEFAULT '설정',
    `webhookSecret` VARCHAR(191) NOT NULL,
    `activeMonth` VARCHAR(191) NOT NULL DEFAULT '2026-06',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Org_slug_key`(`slug`),
    UNIQUE INDEX `Org_webhookSecret_key`(`webhookSecret`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. 기존 ScheduleConfig → 기본 조직(org_default). name/activeMonth 승계.
--    sheetId/webhookSecret/prefix 는 부팅 시드(seed.service)가 env 값으로 채운다.
--    webhookSecret 은 UNIQUE NOT NULL 이라 비지 않고 유일한 placeholder 사용.
INSERT INTO `Org` (`id`,`slug`,`name`,`sheetId`,`gridTabPrefix`,`settingsTab`,`webhookSecret`,`activeMonth`,`updatedAt`)
SELECT 'org_default','default',`orgName`,'','근무표','설정',CONCAT('__bootstrap__',`id`),`activeMonth`,NOW(3)
FROM `ScheduleConfig` WHERE `id` = 1;

-- ScheduleConfig 행이 없을 때를 위한 폴백
INSERT INTO `Org` (`id`,`slug`,`name`,`sheetId`,`gridTabPrefix`,`settingsTab`,`webhookSecret`,`activeMonth`,`updatedAt`)
SELECT 'org_default','default','코어솔루션','','근무표','설정','__bootstrap__default','2026-06',NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `Org` WHERE `id` = 'org_default');

-- 3. Employee / Assignment: orgId nullable 추가 → 백필 → NOT NULL
ALTER TABLE `Employee`   ADD COLUMN `orgId` VARCHAR(191) NULL;
ALTER TABLE `Assignment` ADD COLUMN `orgId` VARCHAR(191) NULL;
UPDATE `Employee`   SET `orgId` = 'org_default' WHERE `orgId` IS NULL;
UPDATE `Assignment` SET `orgId` = 'org_default' WHERE `orgId` IS NULL;
ALTER TABLE `Employee`   MODIFY `orgId` VARCHAR(191) NOT NULL;
ALTER TABLE `Assignment` MODIFY `orgId` VARCHAR(191) NOT NULL;

-- 4. ShiftType: orgId 추가/백필 → 복합 PK (orgId, code)
ALTER TABLE `ShiftType` ADD COLUMN `orgId` VARCHAR(191) NULL;
UPDATE `ShiftType` SET `orgId` = 'org_default' WHERE `orgId` IS NULL;
ALTER TABLE `ShiftType` MODIFY `orgId` VARCHAR(191) NOT NULL;
ALTER TABLE `ShiftType` DROP PRIMARY KEY, ADD PRIMARY KEY (`orgId`, `code`);

-- 5. AggregateBucket: orgId 추가/백필 → 복합 PK (orgId, key)
ALTER TABLE `AggregateBucket` ADD COLUMN `orgId` VARCHAR(191) NULL;
UPDATE `AggregateBucket` SET `orgId` = 'org_default' WHERE `orgId` IS NULL;
ALTER TABLE `AggregateBucket` MODIFY `orgId` VARCHAR(191) NOT NULL;
ALTER TABLE `AggregateBucket` DROP PRIMARY KEY, ADD PRIMARY KEY (`orgId`, `key`);

-- 6. 인덱스 재구성
CREATE INDEX `Employee_orgId_sortOrder_idx` ON `Employee`(`orgId`, `sortOrder`);
DROP INDEX `Assignment_date_idx` ON `Assignment`;
CREATE INDEX `Assignment_orgId_date_idx` ON `Assignment`(`orgId`, `date`);

-- 7. 외래키 (orgId NOT NULL 백필 완료 후)
ALTER TABLE `Employee`        ADD CONSTRAINT `Employee_orgId_fkey`        FOREIGN KEY (`orgId`) REFERENCES `Org`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Assignment`      ADD CONSTRAINT `Assignment_orgId_fkey`      FOREIGN KEY (`orgId`) REFERENCES `Org`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ShiftType`       ADD CONSTRAINT `ShiftType_orgId_fkey`       FOREIGN KEY (`orgId`) REFERENCES `Org`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AggregateBucket` ADD CONSTRAINT `AggregateBucket_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `Org`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. 싱글톤 제거 (Org 로 대체됨)
DROP TABLE `ScheduleConfig`;
