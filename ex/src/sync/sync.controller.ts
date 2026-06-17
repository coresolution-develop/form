import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { SyncProducer } from './sync.producer';
import { SheetRowPayload } from '../sheets/sheets.types';

@Controller('sync')
export class SyncController {
  constructor(private producer: SyncProducer) {}

  @Post('sheet-webhook')
  async fromSheet(
    @Headers('x-webhook-secret') secret: string,
    @Body() body: { rows: SheetRowPayload[] },
  ) {
    if (secret !== process.env.SHEET_WEBHOOK_SECRET) {
      throw new UnauthorizedException();
    }
    for (const row of body.rows ?? []) {
      await this.producer.enqueueSheetToDb(row);
    }
    return { ok: true, count: body.rows?.length ?? 0 };
  }
}
