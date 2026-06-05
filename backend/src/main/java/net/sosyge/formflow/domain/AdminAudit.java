package net.sosyge.formflow.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * admin_audits 테이블 매핑 (관리자 작업 감사, §5.2).
 * detail 은 MySQL JSON 컬럼 → {@link net.sosyge.formflow.mybatis.handler.JsonMapTypeHandler} 로 변환.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAudit {
    private Long id;
    private Long adminId;
    private String action;       // AdminAction.name()
    private String targetType;   // AdminAuditTargetType.name()
    private Long targetId;
    private Map<String, Object> detail;
    private String ip;
    private LocalDateTime createdAt;
}
