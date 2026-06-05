package net.sosyge.formflow.dto.request.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 64) String password,
        @NotBlank @Size(max = 50) String nickname,
        String recaptchaToken,
        @NotNull @Valid TermsAgreement termsAgreement
) {
    public record TermsAgreement(
            boolean service,
            boolean privacy,
            boolean marketing
    ) {}
}
