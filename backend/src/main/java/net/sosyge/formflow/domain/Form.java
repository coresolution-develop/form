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
    private FormStatus status;
    private Integer responseLimit;
    private LocalDateTime closedAt;
    private LocalDateTime closesAt;
    private LocalDateTime deletedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
