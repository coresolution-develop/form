package net.sosyge.formflow.dto.response.form;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 폼 목록 항목 (§7.5 GET /api/forms).
 * MyBatis가 JOIN 결과를 setter로 매핑하므로 record가 아닌 mutable 클래스.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FormSummaryResponse {
    private Long id;
    private String slug;
    private String title;
    private String status;
    private long responseCount;
    private Integer responseLimit;
    private LocalDateTime createdAt;
}
