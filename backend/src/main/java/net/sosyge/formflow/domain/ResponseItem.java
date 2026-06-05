package net.sosyge.formflow.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** response_items 테이블 매핑 (응답 항목). */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResponseItem {
    private Long id;
    private Long responseId;
    private Long fieldId;
    private String value;
}
