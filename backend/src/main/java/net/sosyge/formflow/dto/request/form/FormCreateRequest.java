package net.sosyge.formflow.dto.request.form;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FormCreateRequest(
        @NotBlank @Size(max = 255) String title,
        String description
) {}
