package net.sosyge.formflow.mapper;

import net.sosyge.formflow.domain.User;
import net.sosyge.formflow.domain.UserStatus;
import net.sosyge.formflow.dto.response.admin.AdminUserItem;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Mapper
public interface UserMapper {

    Optional<User> findByEmail(@Param("email") String email);

    Optional<User> findById(@Param("id") Long id);

    /** id를 useGeneratedKeys로 채워 반환. */
    void insert(User user);

    void updateNickname(@Param("id") Long id, @Param("nickname") String nickname);

    void updateStatus(@Param("id") Long id, @Param("status") UserStatus status);

    void updateLastLoginAt(@Param("id") Long id, @Param("at") LocalDateTime at);

    void updateEmailVerifiedAt(@Param("id") Long id, @Param("at") LocalDateTime at);

    void updatePassword(@Param("id") Long id, @Param("password") String password);

    // --- 관리자 (§7.10) ---

    /** 정지 사유와 상태를 함께 갱신 (SUSPENDED 시 사유 기록, ACTIVE 복원 시 null). */
    void updateStatusAndReason(@Param("id") Long id,
                               @Param("status") UserStatus status,
                               @Param("reason") String reason);

    /** 관리자 사용자 목록 (status/email 필터, formCount LEFT JOIN GROUP BY로 N+1 방지). */
    List<AdminUserItem> findPageForAdmin(@Param("status") UserStatus status,
                                         @Param("email") String email,
                                         @Param("offset") int offset,
                                         @Param("size") int size);

    long countForAdmin(@Param("status") UserStatus status,
                       @Param("email") String email);

    // --- 대시보드 (§10.3) ---

    long countCreatedBetween(@Param("start") LocalDateTime start,
                             @Param("end") LocalDateTime end);

    /** since(포함) 이후 일자별 가입 수. */
    List<net.sosyge.formflow.dto.response.admin.DailyCount> dailySignupsSince(@Param("since") LocalDateTime since);

    // --- 배치 (§10.6) ---

    /** DELETED 상태이고 30일 지났으며 아직 익명화되지 않은 사용자 ID 목록. */
    List<Long> findDeletedToAnonymize(@Param("before") LocalDateTime before);

    /** 이메일/닉네임/비밀번호 익명화. */
    void anonymize(@Param("id") Long id,
                   @Param("email") String email,
                   @Param("nickname") String nickname);
}
