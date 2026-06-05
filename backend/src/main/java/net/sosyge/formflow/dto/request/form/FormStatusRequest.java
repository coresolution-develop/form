package net.sosyge.formflow.dto.request.form;

import jakarta.validation.constraints.NotNull;
import net.sosyge.formflow.domain.FormStatus;

import java.time.LocalDateTime;

public record FormStatusRequest(
        @NotNull FormStatus status,
        LocalDateTime closedAt
) {}
