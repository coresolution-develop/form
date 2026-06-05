package net.sosyge.formflow.dto.response.field;

import net.sosyge.formflow.domain.FormField;

import java.util.List;
import java.util.Map;

public record FieldResponse(
        Long id,
        String type,
        String label,
        String placeholder,
        boolean required,
        int orderNum,
        List<String> options,
        Map<String, Object> validation
) {
    public static FieldResponse from(FormField f) {
        return new FieldResponse(
                f.getId(),
                f.getType().name(),
                f.getLabel(),
                f.getPlaceholder(),
                f.isRequired(),
                f.getOrderNum(),
                f.getOptions(),
                f.getValidation()
        );
    }
}
