import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { SyncProducer } from './sync.producer';
import { SheetWebhookBody } from '../sheets/sheets.types';

@Controller('sync')
export class SyncController {
  private readonly logger = new Logger('SyncController');

  constructor(private producer: SyncProducer) {}

  @Post('sheet-webhook')
  async fromSheet(
    @Headers('x-webhook-secret') secret: string,
    @Body() body: SheetWebhookBody,
  ) {
    this.logger.log(
      `webhook received: month=${body.month} ${body.rows?.length ?? 0} row(s)`,
    );
    if (secret !== process.env.SHEET_WEBHOOK_SECRET) {
      this.logger.warn('webhook rejected: bad secret');
      throw new UnauthorizedException();
    }
    for (const row of body.rows ?? []) {
      await this.producer.enqueueSheetToDb(body.month, row);
    }
    return { ok: true, count: body.rows?.length ?? 0 };
  }
}
