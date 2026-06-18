import { Module } from '@nestjs/common';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SheetsModule } from '../sheets/sheets.module';
import { SyncModule } from '../sync/sync.module';
import { OrgModule } from '../org/org.module';

@Module({
  imports: [PrismaModule, SheetsModule, SyncModule, OrgModule],
  controllers: [ScheduleController],
  providers: [ScheduleService],
})
export class ScheduleModule {}
