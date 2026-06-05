package net.sosyge.formflow.service.admin;

import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.common.PageResponse;
import net.sosyge.formflow.domain.AdminAction;
import net.sosyge.formflow.domain.AdminAudit;
import net.sosyge.formflow.domain.AdminAuditTargetType;
import net.sosyge.formflow.dto.response.admin.AdminAuditItem;
import net.sosyge.formflow.mapper.AdminAuditMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 관리자 감사 로그 (§7.10 / §10.2).
 * {@link #record}는 호출자의 트랜잭션 안에서 INSERT 되어 변경 작업과 원자적으로 커밋된다.
 */
@Service
@RequiredArgsConstructor
public class AdminAuditService {

    private final AdminAuditMapper adminAuditMapper;

    /** 관리 변경 작업 1건을 감사 로그로 기록한다. (호출자 트랜잭션 내) */
    public void record(Long adminId, AdminAction action, AdminAuditTargetType targetType,
                       Long targetId, Map<String, Object> detail, String ip) {
        AdminAudit audit = AdminAudit.builder()
                .adminId(adminId)
                .action(action.name())
                .targetType(targetType.name())
                .targetId(targetId)
                .detail(detail)
                .ip(ip)
                .build();
        adminAuditMapper.insert(audit);
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminAuditItem> getAudits(String targetType, int page, int size) {
        int offset = (page - 1) * size;
        List<AdminAuditItem> items = adminAuditMapper.findPage(targetType, offset, size);
        long total = adminAuditMapper.count(targetType);
        return PageResponse.of(items, page, size, total);
    }
}
