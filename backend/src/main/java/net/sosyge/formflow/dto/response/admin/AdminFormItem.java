package net.sosyge.formflow.dto.response.admin;

import net.sosyge.formflow.domain.FormStatus;

import java.time.LocalDateTime;

/**
 * GET /api/admin/forms 목록 아이템 (§7.10).
 * pendingReportCount: 같은 폼의 PENDING 신고 수 (§10.2 누적 감지/정렬 힌트).
 */
public record AdminFormItem(
        Long id,
        String slug,
        String title,
        FormStatus status,
        Long ownerId,
        String ownerEmail,
        long responseCount,
        long pendingReportCount,
        LocalDateTime createdAt
) {}
