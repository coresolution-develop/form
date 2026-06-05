package net.sosyge.formflow.dto.response.admin;

import net.sosyge.formflow.domain.ReportReason;
import net.sosyge.formflow.domain.ReportStatus;

import java.time.LocalDateTime;

/**
 * GET /api/admin/reports 신고 큐 아이템 (§7.10 / §10.2).
 * pendingCountForForm: 같은 폼의 PENDING 신고 누적 수 (3건 이상 = 우선 처리 힌트).
 */
public record AdminReportItem(
        Long id,
        Long formId,
        String formTitle,
        String formSlug,
        ReportReason reason,
        String detail,
        ReportStatus status,
        Long reporterUserId,
        Long handledBy,
        LocalDateTime handledAt,
        long pendingCountForForm,
        LocalDateTime createdAt
) {}
