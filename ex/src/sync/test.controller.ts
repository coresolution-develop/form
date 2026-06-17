import { Controller, Post, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SyncProducer } from './sync.producer';

/**
 * 테스트 전용: 서비스가 DB를 바꾼 뒤 DB→시트 푸시를 트리거 (Phase 2 T6/T7 검증).
 * 운영에서는 실제 서비스 로직에서 enqueueDbToSheet(id) 를 호출한다.
 */
@Controller('test')
export class TestController {
  constructor(
    private prisma: PrismaService,
    private producer: SyncProducer,
  ) {}

  @Post('update-computed/:id')
  async updateComputed(@Param('id') id: string) {
    const p = await this.prisma.product.update({
      where: { id },
      data: { computed: { increment: 1 } },
    });
    await this.producer.enqueueDbToSheet(id);
    return { ok: true, id, computed: p.computed };
  }
}
