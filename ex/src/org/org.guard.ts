import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { OrgService } from './org.service';

/**
 * 테넌트 해석 가드. 해석 순서:
 *   1) `X-Org-Id` 헤더 (id 또는 slug)
 *   2) `?org=` 쿼리 (id 또는 slug)
 *   3) 기본 조직 (env DEFAULT_ORG_ID, 기본 'org_default') — 단일 시트 셋업 하위호환
 * 해석된 org 를 req.org / req.orgId 에 부착한다. 명시 참조가 잘못되면 404.
 */
@Injectable()
export class OrgGuard implements CanActivate {
  constructor(private orgService: OrgService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const headerRaw = req.headers?.['x-org-id'];
    const header = Array.isArray(headerRaw) ? headerRaw[0] : headerRaw;
    const ref = (header || req.query?.org || '').toString().trim();

    let org = ref ? await this.orgService.findByIdOrSlug(ref) : null;
    if (ref && !org) throw new NotFoundException(`unknown org: ${ref}`);

    if (!org) {
      const defId = process.env.DEFAULT_ORG_ID || 'org_default';
      org = await this.orgService.findByIdOrSlug(defId);
    }
    if (!org) throw new InternalServerErrorException('no org configured');

    req.org = org;
    req.orgId = org.id;
    return true;
  }
}
