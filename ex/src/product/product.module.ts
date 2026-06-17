import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SheetsModule } from '../sheets/sheets.module';

@Module({
  imports: [PrismaModule, SheetsModule],
  controllers: [ProductController],
})
export class ProductModule {}
