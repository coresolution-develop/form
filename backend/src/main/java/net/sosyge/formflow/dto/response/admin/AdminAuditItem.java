package net.sosyge.formflow.dto.response.admin;

import java.time.LocalDateTime;
import java.util.Map;

/** GET /api/admin/audits 감사 로그 아이템 (§7.10). detail 은 JSON → Map. */
public record AdminAuditItem(
        Long id,
        Long adminId,
        String adminEmail,
        String action,
        String targetType,
        Long targetId,
        Map<String, Object> detail,
        String ip,
        LocalDateTime createdAt
) {}
