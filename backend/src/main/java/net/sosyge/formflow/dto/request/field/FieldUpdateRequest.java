package net.sosyge.formflow.dto.request.field;

import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

/** PATCH 부분 수정 — type은 변경 불가. 모든 필드 선택적. */
public record FieldUpdateRequest(
        @Size(max = 500) String label,
        @Size(max = 255) String placeholder,
        Boolean required,
        List<String> options,
        Map<String, Object> validation
) {}
