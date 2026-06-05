package net.sosyge.formflow.dto.request.field;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import net.sosyge.formflow.domain.FieldType;

import java.util.List;
import java.util.Map;

public record FieldCreateRequest(
        @NotNull FieldType type,
        @NotBlank @Size(max = 500) String label,
        @Size(max = 255) String placeholder,
        Boolean required,
        List<String> options,
        Map<String, Object> validation
) {}
