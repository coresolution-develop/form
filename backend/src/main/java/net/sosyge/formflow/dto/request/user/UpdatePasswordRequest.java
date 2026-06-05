package net.sosyge.formflow.dto.request.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdatePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 8, max = 64) String newPassword
) {}
