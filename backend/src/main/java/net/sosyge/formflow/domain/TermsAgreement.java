package net.sosyge.formflow.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** terms_agreements 테이블 매핑. */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TermsAgreement {
    private Long id;
    private Long userId;
    private TermsType termsType;
    private String termsVersion;
    private boolean agreed;
    private LocalDateTime agreedAt;
    private String ip;
}
