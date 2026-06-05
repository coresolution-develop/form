package net.sosyge.formflow.dto.request.admin;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import net.sosyge.formflow.domain.ReportStatus;

/** PATCH /api/admin/reports/{id} (§7.10). */
public record AdminReportUpdateRequest(
        @NotNull ReportStatus status,
        @Size(max = 1000) String detail
) {}
