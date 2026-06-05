package net.sosyge.formflow.dto.response.admin;

import net.sosyge.formflow.domain.UserRole;
import net.sosyge.formflow.domain.UserStatus;

import java.time.LocalDateTime;

/** GET /api/admin/users 목록 아이템 (§7.10). formCount 는 LEFT JOIN GROUP BY 로 채운다. */
public record AdminUserItem(
        Long id,
        String email,
        String nickname,
        UserRole role,
        UserStatus status,
        long formCount,
        LocalDateTime lastLoginAt,
        LocalDateTime createdAt
) {}
