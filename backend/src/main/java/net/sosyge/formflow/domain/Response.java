package net.sosyge.formflow.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** responses 테이블 매핑 (제출 1건). */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Response {
    private Long id;
    private Long formId;
    private String respondentKey;
    private String ip;
    private String userAgent;
    private LocalDateTime submittedAt;
}
