package net.sosyge.formflow.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** form_fields 테이블 매핑. options/validation은 JSON 컬럼. */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FormField {
    private Long id;
    private Long formId;
    private FieldType type;
    private String label;
    private String placeholder;
    private boolean required;
    private int orderNum;
    private List<String> options;
    private Map<String, Object> validation;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
