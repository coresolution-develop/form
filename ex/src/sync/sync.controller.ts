import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { SyncProducer } from './sync.producer';
import { OrgService } from '../org/org.service';
import { SheetWebhookBody } from '../sheets/sheets.types';

/**
 * Apps Script 웹훅 진입점. 시크릿(x-webhook-secret)이 곧 테넌트 식별자 —
 * Org.webhookSecret 매칭으로 조직을 해석한다(가드 미적용; 시크릿이 인증+테넌트).
 */
@Controller('sync')
export class SyncController {
  private readonly logger = new Logger('SyncController');

  constructor(
    private producer: SyncProducer,
    private orgService: OrgService,
  ) {}

  @Post('sheet-webhook')
  async fromSheet(
    @Headers('x-webhook-secret') secret: string,
    @Body() body: SheetWebhookBody,
  ) {
    const org = await this.orgService.findBySecret(secret);
    if (!org) {
      this.logger.warn('webhook rejected: bad secret');
      throw new UnauthorizedException();
    }
    this.logger.log(
      `webhook received: org=${org.slug} month=${body.month} ${body.rows?.length ?? 0} row(s)`,
    );
    for (const row of body.rows ?? []) {
      await this.producer.enqueueSheetToDb(org.id, body.month, row);
    }
    return { ok: true, count: body.rows?.length ?? 0 };
  }

  /** `설정` 탭 편집 → 설정 전체 재읽기 큐잉 (본문 불필요, 탭을 통째로 다시 읽음) */
  @Post('settings-webhook')
  async fromSettings(@Headers('x-webhook-secret') secret: string) {
    const org = await this.orgService.findBySecret(secret);
    if (!org) {
      this.logger.warn('settings webhook rejected: bad secret');
      throw new UnauthorizedException();
    }
    this.logger.log(`settings webhook received: org=${org.slug}`);
    await this.producer.enqueueSheetToSettings(org.id);
    return { ok: true };
  }
}
