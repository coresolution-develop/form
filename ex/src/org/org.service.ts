import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Org, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SHIFT_TYPE_SEED, BUCKET_SEED } from '../schedule/seed.data';
import { CreateOrgDto, UpdateOrgDto } from './org.types';

/**
 * 조직(테넌트) 도메인 서비스.
 *  - onModuleInit: 기본 조직(org_default) 보장 + 시드 (구 ScheduleSeedService 대체).
 *    Org(DB)가 조직 설정의 SSOT — env 는 placeholder 최초 1회 보강에만 쓴다.
 *  - seedOrgDefaults: 신규 조직 생성 시 재사용하는 근무형태/버킷 기본 시드.
 */
@Injectable()
export class OrgService implements OnModuleInit {
  private readonly logger = new Logger('OrgService');

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureDefaultOrg();
  }

  /**
   * 기본 조직(env DEFAULT_ORG_ID, 기본 'org_default') 보장 + 시드. 멱등.
   * Org(DB)가 조직 설정의 SSOT. env 는 "기존 시트/시크릿을 최초 1회 자동 바인딩"하는 용도로만,
   * placeholder(빈 sheetId / __bootstrap__ 시크릿)일 때만 채운다 — 이후 prefix·탭·시크릿·activeMonth 는
   * DB 가 주인이라 재기동해도 env(SHEET_TAB 등)가 덮어쓰지 않는다.
   */
  private async ensureDefaultOrg() {
    const id = process.env.DEFAULT_ORG_ID || 'org_default';
    const existing = await this.prisma.org.findUnique({ where: { id } });

    if (!existing) {
      // 마이그레이션 없이 부팅한 드문 경우 — env(있으면)로 1회 시드.
      await this.prisma.org.create({
        data: {
          id,
          slug: 'default',
          name: '코어솔루션',
          sheetId: process.env.SHEET_ID ?? '',
          gridTabPrefix: '근무표',
          settingsTab: '설정',
          webhookSecret: process.env.SHEET_WEBHOOK_SECRET ?? `__bootstrap__${id}`,
        },
      });
    } else {
      // placeholder 만 env 로 보강 — prefix/settingsTab/activeMonth/실 시크릿은 건드리지 않는다.
      const patch: Prisma.OrgUpdateInput = {};
      if (!existing.sheetId && process.env.SHEET_ID) patch.sheetId = process.env.SHEET_ID;
      if (existing.webhookSecret.startsWith('__bootstrap__') && process.env.SHEET_WEBHOOK_SECRET)
        patch.webhookSecret = process.env.SHEET_WEBHOOK_SECRET;
      if (Object.keys(patch).length)
        await this.prisma.org.update({ where: { id }, data: patch });
    }

    await this.seedOrgDefaults(id);
    this.logger.log(`default org '${id}' ensured`);
  }

  /**
   * 조직 기본 근무형태/버킷 시드 (멱등 upsert).
   * 라벨·색·기여 정의는 코드를 source-of-truth 로 보고 항상 갱신한다.
   */
  async seedOrgDefaults(orgId: string) {
    for (const b of BUCKET_SEED) {
      await this.prisma.aggregateBucket.upsert({
        where: { orgId_key: { orgId, key: b.key } },
        create: { orgId, key: b.key, label: b.label, sortOrder: b.sortOrder },
        update: { label: b.label, sortOrder: b.sortOrder },
      });
    }
    for (const s of SHIFT_TYPE_SEED) {
      await this.prisma.shiftType.upsert({
        where: { orgId_code: { orgId, code: s.code } },
        create: { orgId, ...s, contributions: s.contributions as any },
        update: {
          label: s.label,
          bgColor: s.bgColor,
          fgColor: s.fgColor,
          sortOrder: s.sortOrder,
          contributions: s.contributions as any,
        },
      });
    }
    this.logger.log(
      `seeded ${BUCKET_SEED.length} buckets, ${SHIFT_TYPE_SEED.length} shift types for org '${orgId}'`,
    );
  }

  list() {
    return this.prisma.org.findMany({ orderBy: { createdAt: 'asc' } });
  }

  /** id 또는 slug 로 조회 (테넌트 해석용). */
  findByIdOrSlug(idOrSlug: string): Promise<Org | null> {
    return this.prisma.org.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    });
  }

  /** 웹훅 시크릿으로 조직 해석 (시크릿 = 테넌트 식별자). */
  findBySecret(webhookSecret: string): Promise<Org | null> {
    if (!webhookSecret) return Promise.resolve(null);
    return this.prisma.org.findUnique({ where: { webhookSecret } });
  }

  async get(id: string): Promise<Org> {
    const org = await this.prisma.org.findUnique({ where: { id } });
    if (!org) throw new NotFoundException(`org not found: ${id}`);
    return org;
  }

  async create(dto: CreateOrgDto): Promise<Org> {
    if (!dto.name || !dto.slug || !dto.webhookSecret)
      throw new BadRequestException('name, slug, webhookSecret required');
    try {
      const org = await this.prisma.org.create({
        data: {
          slug: dto.slug,
          name: dto.name,
          sheetId: dto.sheetId ?? '',
          gridTabPrefix: dto.gridTabPrefix ?? '근무표',
          settingsTab: dto.settingsTab ?? '설정',
          webhookSecret: dto.webhookSecret,
          activeMonth: dto.activeMonth ?? '2026-06',
        },
      });
      await this.seedOrgDefaults(org.id);
      return org;
    } catch (e) {
      throw this.normalize(e);
    }
  }

  async update(id: string, dto: UpdateOrgDto): Promise<Org> {
    await this.get(id); // 존재 확인 → 404
    try {
      return await this.prisma.org.update({ where: { id }, data: { ...dto } });
    } catch (e) {
      throw this.normalize(e);
    }
  }

  /** rollMonth 등에서 활성 월만 갱신. */
  setActiveMonth(id: string, activeMonth: string): Promise<Org> {
    return this.prisma.org.update({ where: { id }, data: { activeMonth } });
  }

  private normalize(e: unknown): Error {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      return new ConflictException('slug or webhookSecret already exists');
    }
    return e as Error;
  }
}
