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
    private LocalDateTime closedAt;
    private LocalDateTime closesAt;
    private LocalDateTime deletedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
