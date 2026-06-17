import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { SheetWriterService } from '../sheets/sheet-writer.service';
import { SheetRowPayload } from '../sheets/sheets.types';

@Processor('sheet-sync')
export class SheetToDbProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private writer: SheetWriterService,
  ) {
    super();
  }

  async process(job: Job) {
    if (job.name !== 'sheet-to-db') return;
    const row = job.data as SheetRowPayload;

    // 1. 검증 (운영팀 오입력 방어)
    if (!row.name) return;
    const price = Number(row.price);
    if (Number.isNaN(price)) {
      // 잘못된 가격 → 시트에 에러 표시 + (선택) 카톡/슬랙 알림
      if (row.id) {
        await this.writer.pushServiceFields(row.id, {
          syncStatus: 'error: price',
          computed: 0,
          updatedAt: new Date().toISOString(),
        });
      }
      return;
    }

    // 2. 신규행(id 없음) → DB가 id 발급 → 시트 A열에 회신
    if (!row.id) {
      const created = await this.prisma.product.create({
        data: {
          name: row.name,
          price,
          status: row.status || 'active',
          memo: row.memo,
          source: 'sheet',
          syncStatus: 'synced',
        },
      });
      await this.writer.writeId(row.rowIndex, created.id);
      await this.writer.pushServiceFields(created.id, {
        syncStatus: 'synced',
        computed: created.computed,
        updatedAt: created.updatedAt.toISOString(),
      });
      return;
    }

    // 3. 기존행 → upsert (LWW). 시트가 운영팀 컬럼의 source of truth
    const saved = await this.prisma.product.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        name: row.name,
        price,
        status: row.status || 'active',
        memo: row.memo,
        source: 'sheet',
        syncStatus: 'synced',
      },
      update: {
        name: row.name,
        price,
        status: row.status || 'active',
        memo: row.memo,
        source: 'sheet',
        syncStatus: 'synced',
      },
    });

    // 서비스 소유 컬럼만 시트에 반영 (운영팀 컬럼은 안 건드림 → 루프 없음)
    await this.writer.pushServiceFields(saved.id, {
      syncStatus: 'synced',
      computed: saved.computed,
      updatedAt: saved.updatedAt.toISOString(),
    });
  }
}
