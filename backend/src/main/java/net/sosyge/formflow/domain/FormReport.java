package net.sosyge.formflow.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** form_reports 테이블 매핑 (사용자 신고). */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FormReport {
    private Long id;
    private Long formId;
    private String reporterIp;
    private Long reporterUserId;
    private ReportReason reason;
    private String detail;
    private ReportStatus status;
    private Long handledBy;
    private LocalDateTime handledAt;
    private LocalDateTime createdAt;
}
