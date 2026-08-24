package net.sosyge.formflow.dto.request.form;

import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** PATCH 부분 수정 — 모든 필드 선택적. 이미지는 별도 업로드 엔드포인트에서 다룬다. */
public record FormUpdateRequest(
        @Size(max = 255) String title,
        String description,
        @Positive Integer responseLimit
) {}
