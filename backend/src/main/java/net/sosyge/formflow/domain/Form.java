package net.sosyge.formflow.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** forms 테이블 매핑. */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Form {
    private Long id;
    private Long userId;
    private String slug;
    private String title;
    private String description;
    /** 배너 이미지 절대 URL(상단 전체폭). NULL=없음. */
    private String headerImageUrl;
    /** 로고 이미지 절대 URL(제목 위 중앙 소형). NULL=없음. */
    private String logoImageUrl;
    private FormStatus status;
    private Integer responseLimit;
    /** 선착순 총 수량. NULL=선착순 미사용. */
    private Integer quotaTotal;
    /** 수량을 차감할 기준 NUMBER 필드 id. */
    private Long quotaFieldId;
    /** 지금까지 소진된 수량(수량 필드 값의 합계). */
    private int quotaUsed;

    /** 선착순을 쓰는 폼인지. 총 수량이 지정돼 있으면 사용으로 본다. */
    public boolean isQuotaEnabled() {
        return quotaTotal != null;
    }

    /** 남은 수량. 선착순 미사용이면 null. */
    public Integer getQuotaRemaining() {
        return quotaTotal == null ? null : Math.max(0, quotaTotal - quotaUsed);
    }
    private LocalDateTime closedAt;
    private LocalDateTime closesAt;
    private LocalDateTime deletedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
