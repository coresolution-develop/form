package net.sosyge.formflow.dto.request.publicform;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SubmitRequest(
        @NotBlank @Size(max = 64) String respondentKey,
        @NotNull List<Answer> answers
) {
    public record Answer(
            @NotNull Long fieldId,
            String value
    ) {}
}
