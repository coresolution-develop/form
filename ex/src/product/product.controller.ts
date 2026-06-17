import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SheetWriterService } from '../sheets/sheet-writer.service';
import { SheetClientService } from '../sheets/sheet-client.service';

/**
 * 웹(서비스) 측 Product 관리 API.
 * 생성/수정 시 DB 반영 후 시트에 바로 미러링한다(웹→DB→시트).
 */
@Controller('products')
export class ProductController {
  constructor(
    private prisma: PrismaService,
    private writer: SheetWriterService,
    private sheetClient: SheetClientService,
  ) {}

  @Get()
  list() {
    return this.prisma.product.findMany({ orderBy: { createdAt: 'asc' } });
  }

  @Post()
  async create(@Body() dto: { name: string; price?: number; status?: string; memo?: string }) {
    const p = await this.prisma.product.create({
      data: {
        name: dto.name,
        price: Number(dto.price) || 0,
        status: dto.status || 'active',
        memo: dto.memo,
        source: 'service',
        syncStatus: 'synced',
      },
    });
    await this.writer.appendNewRow(p); // 시트 끝에 새 행
    return p;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<{ name: string; price: number; status: string; memo: string }>) {
    const data: Record<string, unknown> = { syncStatus: 'synced' };
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.price !== undefined) data.price = Number(dto.price) || 0;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.memo !== undefined) data.memo = dto.memo;

    const p = await this.prisma.product.update({ where: { id }, data });
    await this.writer.writeFullRow(p); // 시트 행 갱신
    return p;
  }

  /**
   * 시트 → DB 전체 재동기화. onEdit이 못 잡는 "행 삭제"를 맞춘다.
   * 시트에 있는 행은 upsert, 시트에 없는 DB 행은 삭제.
   */
  @Post('reconcile')
  async reconcile() {
    const rows = await this.sheetClient.readAll();
    const sheetIds: string[] = [];

    for (const r of rows) {
      if (!r.name) continue; // 빈 행 스킵
      const price = Number(r.price) || 0;
      if (r.id) {
        await this.prisma.product.upsert({
          where: { id: r.id },
          create: { id: r.id, name: r.name, price, status: r.status, memo: r.memo, source: 'sheet', syncStatus: 'synced' },
          update: { name: r.name, price, status: r.status, memo: r.memo, syncStatus: 'synced' },
        });
        sheetIds.push(r.id);
      } else {
        // 시트에 id 없는 행(아직 미동기화) → 생성 + 시트에 id 회신
        const created = await this.prisma.product.create({
          data: { name: r.name, price, status: r.status, memo: r.memo, source: 'sheet', syncStatus: 'synced' },
        });
        await this.writer.writeId(r.rowIndex, created.id);
        sheetIds.push(created.id);
      }
    }

    // 시트에 없는 DB 행 삭제 (sheetIds 가 비면 전부 삭제 — 시트가 비었다는 뜻)
    const deleted = await this.prisma.product.deleteMany({
      where: sheetIds.length ? { id: { notIn: sheetIds } } : {},
    });

    return { reconciled: sheetIds.length, deleted: deleted.count };
  }
}
