package net.sosyge.formflow.dto.request.user;

import jakarta.validation.constraints.NotBlank;

public record DeleteMeRequest(
        @NotBlank String password
) {}
