package net.sosyge.formflow.dto.response.form;

import net.sosyge.formflow.domain.Form;
import net.sosyge.formflow.domain.FormField;
import net.sosyge.formflow.dto.response.field.FieldResponse;

import java.time.LocalDateTime;
import java.util.List;

public record FormDetailResponse(
        Long id,
        String slug,
        String title,
        String description,
        String status,
        Integer responseLimit,
        long responseCount,
        LocalDateTime closedAt,
        String publicUrl,
        List<FieldResponse> fields
) {
    public static FormDetailResponse of(Form form, List<FormField> fields, long responseCount, String publicUrl) {
        return new FormDetailResponse(
                form.getId(),
                form.getSlug(),
                form.getTitle(),
                form.getDescription(),
                form.getStatus().name(),
                form.getResponseLimit(),
                responseCount,
                form.getClosedAt(),
                publicUrl,
                fields.stream().map(FieldResponse::from).toList()
        );
    }
}
