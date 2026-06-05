package net.sosyge.formflow.dto.response.publicform;

import net.sosyge.formflow.domain.Form;
import net.sosyge.formflow.domain.FormField;
import net.sosyge.formflow.dto.response.field.FieldResponse;

import java.util.List;

/**
 * 공개 폼 조회 응답 (§7.7).
 * 응답자에게 노출 가능한 정보만 포함 — status/responseCount/userId/responseLimit/publicUrl 제외.
 */
public record PublicFormResponse(
        String slug,
        String title,
        String description,
        List<FieldResponse> fields
) {
    public static PublicFormResponse of(Form form, List<FormField> fields) {
        return new PublicFormResponse(
                form.getSlug(),
                form.getTitle(),
                form.getDescription(),
                fields.stream().map(FieldResponse::from).toList()
        );
    }
}
