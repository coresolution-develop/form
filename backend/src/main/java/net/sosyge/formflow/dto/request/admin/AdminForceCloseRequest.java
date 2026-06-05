package net.sosyge.formflow.dto.request.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** PATCH /api/admin/forms/{id}/force-close (§7.10). */
public record AdminForceCloseRequest(
        @NotBlank @Size(max = 500) String reason
) {}
