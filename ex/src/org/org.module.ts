import { Module } from '@nestjs/common';
import { OrgService } from './org.service';
import { OrgController } from './org.controller';
import { OrgGuard } from './org.guard';

/**
 * 테넌트(조직) 모듈. PrismaModule 은 @Global 이라 별도 import 불필요.
 * 다른 모듈(Schedule/Sync)이 OrgService/OrgGuard 를 쓰려면 이 모듈을 import 한다.
 */
@Module({
  controllers: [OrgController],
  providers: [OrgService, OrgGuard],
  exports: [OrgService, OrgGuard],
})
export class OrgModule {}
