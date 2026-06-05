package net.sosyge.formflow.dto.request.form;

import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** PATCH 부분 수정 — 모든 필드 선택적. */
public record FormUpdateRequest(
        @Size(max = 255) String title,
        String description,
        @Positive Integer responseLimit
) {}
