package net.sosyge.formflow.dto.response.admin;

import net.sosyge.formflow.domain.UserRole;
import net.sosyge.formflow.domain.UserStatus;
import net.sosyge.formflow.dto.response.form.FormSummaryResponse;

import java.time.LocalDateTime;
import java.util.List;

/**
 * GET /api/admin/users/{id} — 어뷰징 조사용 사용자 상세 (§10.2).
 * 사용자 기본정보 + 보유 폼 목록 + 집계(폼 수/총 응답 수).
 */
public record AdminUserDetail(
        Long id,
        String email,
        String nickname,
        UserRole role,
        UserStatus status,
        String plan,
        String suspendedReason,
        LocalDateTime emailVerifiedAt,
        LocalDateTime lastLoginAt,
        LocalDateTime createdAt,
        long formCount,
        long totalResponses,
        List<FormSummaryResponse> forms
) {}
