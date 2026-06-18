import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { OrgService } from './org.service';
import { CreateOrgDto, UpdateOrgDto, toPublicOrg } from './org.types';

/** 조직 CRUD. 가드 미적용 — 셀렉터 목록/생성은 테넌트 컨텍스트가 필요 없다. */
@Controller('orgs')
export class OrgController {
  constructor(private orgService: OrgService) {}

  @Get()
  async list() {
    return (await this.orgService.list()).map(toPublicOrg);
  }

  @Post()
  async create(@Body() dto: CreateOrgDto) {
    return toPublicOrg(await this.orgService.create(dto));
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return toPublicOrg(await this.orgService.get(id));
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateOrgDto) {
    return toPublicOrg(await this.orgService.update(id, dto));
  }
}
