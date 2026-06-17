import { Module } from '@nestjs/common';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { ScheduleSeedService } from './seed.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SheetsModule } from '../sheets/sheets.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [PrismaModule, SheetsModule, SyncModule],
  controllers: [ScheduleController],
  providers: [ScheduleService, ScheduleSeedService],
})
export class ScheduleModule {}
