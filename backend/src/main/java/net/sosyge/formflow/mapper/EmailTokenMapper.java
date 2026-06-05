package net.sosyge.formflow.mapper;

import net.sosyge.formflow.domain.EmailToken;
import net.sosyge.formflow.domain.EmailTokenPurpose;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.Optional;

@Mapper
public interface EmailTokenMapper {

    void insert(EmailToken token);

    Optional<EmailToken> findByTokenHashAndPurpose(@Param("tokenHash") String tokenHash,
                                                   @Param("purpose") EmailTokenPurpose purpose);

    void markUsed(@Param("id") Long id, @Param("usedAt") LocalDateTime usedAt);

    int deleteOldUsed(@Param("before") LocalDateTime before);

    /** 배치(§10.6): 만료됐거나 사용 후 30일 지난 토큰 DELETE. */
    int deleteExpiredOrUsed(@Param("now") LocalDateTime now,
                            @Param("usedBefore") LocalDateTime usedBefore);
}
