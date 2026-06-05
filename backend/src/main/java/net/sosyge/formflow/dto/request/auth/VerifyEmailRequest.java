package net.sosyge.formflow.dto.request.auth;

import jakarta.validation.constraints.NotBlank;

public record VerifyEmailRequest(
        @NotBlank String token
) {}
