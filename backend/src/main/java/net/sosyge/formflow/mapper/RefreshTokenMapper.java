package net.sosyge.formflow.mapper;

import net.sosyge.formflow.domain.RefreshToken;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.Optional;

@Mapper
public interface RefreshTokenMapper {

    void insert(RefreshToken token);

    Optional<RefreshToken> findByTokenHash(@Param("tokenHash") String tokenHash);

    void revoke(@Param("id") Long id, @Param("revokedAt") LocalDateTime revokedAt);

    void revokeAllByUserId(@Param("userId") Long userId, @Param("revokedAt") LocalDateTime revokedAt);

    int deleteExpired(@Param("now") LocalDateTime now);

    /** 배치(§10.6): 만료됐거나 revoke 후 30일 지난 토큰 DELETE. */
    int deleteExpiredOrRevoked(@Param("now") LocalDateTime now,
                               @Param("revokedBefore") LocalDateTime revokedBefore);
}
