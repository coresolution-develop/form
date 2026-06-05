package net.sosyge.formflow.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** users 테이블 매핑. (MyBatis setter 매핑을 위해 @NoArgsConstructor/@Setter 포함) */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {
    private Long id;
    private String email;
    private String password;
    private String nickname;
    private UserRole role;
    private UserStatus status;
    private UserPlan plan;
    private LocalDateTime emailVerifiedAt;
    private LocalDateTime lastLoginAt;
    private String suspendedReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
