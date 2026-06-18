import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Org } from '@prisma/client';

/** OrgGuard 가 부착한 현재 테넌트 id. */
export const OrgId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string =>
    ctx.switchToHttp().getRequest().orgId,
);

/** OrgGuard 가 부착한 현재 테넌트 레코드 전체 (sheetId/activeMonth 등 필요할 때). */
export const CurrentOrg = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Org =>
    ctx.switchToHttp().getRequest().org,
);
