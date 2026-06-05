package net.sosyge.formflow.dto.request.admin;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import net.sosyge.formflow.domain.UserStatus;

/**
 * PATCH /api/admin/users/{id}/status (§7.10).
 * status 는 ACTIVE(복원) 또는 SUSPENDED(정지)만 허용 — 검증은 서비스에서.
 */
public record AdminUserStatusRequest(
        @NotNull UserStatus status,
        @Size(max = 500) String reason
) {}
