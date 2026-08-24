package net.sosyge.formflow.dto.request.form;

import jakarta.validation.constraints.Positive;

/**
 * 선착순 설정 변경.
 * 둘 다 null 이면 선착순 해제, 둘 다 값이 있으면 설정. 한쪽만 보내면 400.
 */
public record QuotaUpdateRequest(
        @Positive Integer quotaTotal,
        Long quotaFieldId
) {}
