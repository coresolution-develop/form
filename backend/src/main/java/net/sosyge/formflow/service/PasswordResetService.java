package net.sosyge.formflow.service;

import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.common.TokenGenerator;
import net.sosyge.formflow.common.TokenHasher;
import net.sosyge.formflow.domain.EmailToken;
import net.sosyge.formflow.domain.EmailTokenPurpose;
import net.sosyge.formflow.domain.User;
import net.sosyge.formflow.exception.InvalidTokenException;
import net.sosyge.formflow.mapper.EmailTokenMapper;
import net.sosyge.formflow.mapper.RefreshTokenMapper;
import net.sosyge.formflow.mapper.UserMapper;
import net.sosyge.formflow.security.PasswordPolicyValidator;
import net.sosyge.formflow.service.mail.MailFacade;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private static final Duration RESET_TTL = Duration.ofHours(1);

    private final UserMapper userMapper;
    private final EmailTokenMapper emailTokenMapper;
    private final RefreshTokenMapper refreshTokenMapper;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicyValidator passwordPolicyValidator;
    private final TokenGenerator tokenGenerator;
    private final TokenHasher tokenHasher;
    private final MailFacade mailFacade;

    /** 재설정 요청. 이메일 존재 여부와 무관하게 항상 동일 응답 (§6.4). */
    @Transactional
    public void request(String email) {
        userMapper.findByEmail(email).ifPresent(user -> {
            String raw = tokenGenerator.generate();
            emailTokenMapper.insert(EmailToken.builder()
                    .userId(user.getId())
                    .purpose(EmailTokenPurpose.RESET_PASSWORD)
                    .tokenHash(tokenHasher.hash(raw))
                    .expiredAt(LocalDateTime.now().plus(RESET_TTL))
                    .build());
            mailFacade.sendPasswordReset(user.getEmail(), user.getNickname(), raw);
        });
    }

    /** 재설정 확정. 비밀번호 변경 + 해당 user의 모든 refresh_tokens revoke (강제 로그아웃). */
    @Transactional
    public void confirm(String token, String newPassword) {
        EmailToken emailToken = emailTokenMapper
                .findByTokenHashAndPurpose(tokenHasher.hash(token), EmailTokenPurpose.RESET_PASSWORD)
                .orElseThrow(InvalidTokenException::new);
        if (emailToken.getUsedAt() != null || emailToken.getExpiredAt().isBefore(LocalDateTime.now())) {
            throw new InvalidTokenException();
        }

        User user = userMapper.findById(emailToken.getUserId())
                .orElseThrow(InvalidTokenException::new);

        passwordPolicyValidator.validate(newPassword, user.getEmail());

        userMapper.updatePassword(user.getId(), passwordEncoder.encode(newPassword));
        emailTokenMapper.markUsed(emailToken.getId(), LocalDateTime.now());
        refreshTokenMapper.revokeAllByUserId(user.getId(), LocalDateTime.now());
    }
}
