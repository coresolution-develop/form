import { Module } from '@nestjs/common';
import { SheetClientService } from './sheet-client.service';
import { SheetWriterService } from './sheet-writer.service';

@Module({
  providers: [SheetClientService, SheetWriterService],
  exports: [SheetClientService, SheetWriterService],
})
export class SheetsModule {}
