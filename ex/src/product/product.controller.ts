import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SheetWriterService } from '../sheets/sheet-writer.service';

/**
 * 웹(서비스) 측 Product 관리 API.
 * 생성/수정 시 DB 반영 후 시트에 바로 미러링한다(웹→DB→시트).
 */
@Controller('products')
export class ProductController {
  constructor(
    private prisma: PrismaService,
    private writer: SheetWriterService,
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
}
