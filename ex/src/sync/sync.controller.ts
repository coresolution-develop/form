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

  /** `설정` 탭 편집 → 설정 전체 재읽기 큐잉 (본문 불필요, 탭을 통째로 다시 읽음) */
  @Post('settings-webhook')
  async fromSettings(@Headers('x-webhook-secret') secret: string) {
    if (secret !== process.env.SHEET_WEBHOOK_SECRET) {
      this.logger.warn('settings webhook rejected: bad secret');
      throw new UnauthorizedException();
    }
    this.logger.log('settings webhook received');
    await this.producer.enqueueSheetToSettings();
    return { ok: true };
  }
}
