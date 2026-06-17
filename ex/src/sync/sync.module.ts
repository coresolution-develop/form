import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SyncController } from './sync.controller';
import { TestController } from './test.controller';
import { SyncProducer } from './sync.producer';
import { SyncProcessor } from './sync.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { SheetsModule } from '../sheets/sheets.module';

@Module({
  imports: [
    PrismaModule,
    SheetsModule,
    BullModule.registerQueue({ name: 'sheet-sync' }),
  ],
  controllers: [SyncController, TestController],
  providers: [SyncProducer, SyncProcessor],
  exports: [SyncProducer],
})
export class SyncModule {}
