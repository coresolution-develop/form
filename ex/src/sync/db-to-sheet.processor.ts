import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { SheetWriterService } from '../sheets/sheet-writer.service';

@Processor('sheet-sync')
export class DbToSheetProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private writer: SheetWriterService,
  ) {
    super();
  }

  async process(job: Job) {
    if (job.name !== 'db-to-sheet') return;
    const { id } = job.data as { id: string };

    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) return;

    // 서비스 소유 컬럼(F~H)에만 반영 → onEdit 안 터짐 → 루프 차단
    await this.writer.pushServiceFields(p.id, {
      syncStatus: p.syncStatus,
      computed: p.computed,
      updatedAt: p.updatedAt.toISOString(),
    });
  }
}
