package net.sosyge.formflow.dto.request.admin;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import net.sosyge.formflow.domain.ReportStatus;

/** PATCH /api/admin/reports/{id} (§7.10). closeForm=true면 대상 폼도 함께 강제 마감(§10.2). */
public record AdminReportUpdateRequest(
        @NotNull ReportStatus status,
        @Size(max = 1000) String detail,
        boolean closeForm
) {}
