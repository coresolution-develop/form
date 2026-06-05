package net.sosyge.formflow.dto.request.publicform;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import net.sosyge.formflow.domain.ReportReason;

public record ReportFormRequest(
        @NotNull ReportReason reason,
        @Size(max = 2000) String detail
) {}
