import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SHIFT_TYPE_SEED, BUCKET_SEED } from './seed.data';

/**
 * 시작 시 근무형태/버킷/설정을 멱등 upsert.
 * ShiftType.label·색·기여 정의는 시드를 source-of-truth로 보고 항상 갱신한다
 * (코드가 곧 세팅 기본값). 운영자가 화면에서 바꾼 값은 별도 정책으로 보존하려면
 * 추후 "seeded" 플래그를 두면 되지만, 실험 단계에선 시드로 덮어쓴다.
 */
@Injectable()
export class ScheduleSeedService implements OnModuleInit {
  private readonly logger = new Logger('ScheduleSeed');

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    for (const b of BUCKET_SEED) {
      await this.prisma.aggregateBucket.upsert({
        where: { key: b.key },
        create: b,
        update: { label: b.label, sortOrder: b.sortOrder },
      });
    }

    for (const s of SHIFT_TYPE_SEED) {
      await this.prisma.shiftType.upsert({
        where: { code: s.code },
        create: { ...s, contributions: s.contributions as any },
        update: {
          label: s.label,
          bgColor: s.bgColor,
          fgColor: s.fgColor,
          sortOrder: s.sortOrder,
          contributions: s.contributions as any,
        },
      });
    }

    await this.prisma.scheduleConfig.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });

    this.logger.log(
      `seeded ${BUCKET_SEED.length} buckets, ${SHIFT_TYPE_SEED.length} shift types`,
    );
  }
}
