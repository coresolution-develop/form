import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SyncController } from './sync.controller';
import { SyncProducer } from './sync.producer';
import { SyncProcessor } from './sync.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { SheetsModule } from '../sheets/sheets.module';
import { OrgModule } from '../org/org.module';

@Module({
  imports: [
    PrismaModule,
    SheetsModule,
    OrgModule,
    BullModule.registerQueue({ name: 'sheet-sync' }),
  ],
  controllers: [SyncController],
  providers: [SyncProducer, SyncProcessor],
  exports: [SyncProducer],
})
export class SyncModule {}
