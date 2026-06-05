package net.sosyge.formflow.dto.response.admin;

import java.util.List;

/** GET /api/admin/dashboard 위젯 데이터 (§10.3). */
public record AdminDashboardResponse(
        long todaySignups,
        long todayResponses,
        long pendingReports,
        List<DailyCount> signupsLast7Days,
        List<DailyCount> responsesLast7Days,
        List<AdminAuditItem> recentAudits
) {}
