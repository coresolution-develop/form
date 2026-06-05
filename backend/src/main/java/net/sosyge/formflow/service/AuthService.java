package net.sosyge.formflow.service;

import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.sosyge.formflow.common.TokenGenerator;
import net.sosyge.formflow.common.TokenHasher;
import net.sosyge.formflow.domain.EmailToken;
import net.sosyge.formflow.domain.EmailTokenPurpose;
import net.sosyge.formflow.domain.RefreshToken;
import net.sosyge.formflow.domain.TermsAgreement;
import net.sosyge.formflow.domain.TermsType;
import net.sosyge.formflow.domain.User;
import net.sosyge.formflow.domain.UserPlan;
import net.sosyge.formflow.domain.UserRole;
import net.sosyge.formflow.domain.UserStatus;
import net.sosyge.formflow.dto.request.auth.LoginRequest;
import net.sosyge.formflow.dto.request.auth.SignupRequest;
import net.sosyge.formflow.dto.response.auth.LoginResponse;
import net.sosyge.formflow.dto.response.auth.SignupResponse;
import net.sosyge.formflow.exception.BusinessException;
import net.sosyge.formflow.exception.ErrorCode;
import net.sosyge.formflow.exception.InvalidTokenException;
import net.sosyge.formflow.mapper.EmailTokenMapper;
import net.sosyge.formflow.mapper.RefreshTokenMapper;
import net.sosyge.formflow.mapper.TermsAgreementMapper;
import net.sosyge.formflow.mapper.UserMapper;
import net.sosyge.formflow.security.JwtProvider;
import net.sosyge.formflow.security.PasswordPolicyValidator;
import net.sosyge.formflow.security.RecaptchaProperties;
import net.sosyge.formflow.security.RecaptchaVerifier;
import net.sosyge.formflow.service.mail.MailFacade;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    /** 현재 약관 버전 (meta.yml.current 과 일치). */
    private static final String TERMS_VERSION = "2025-05-01";
    private static final Duration VERIFY_TTL = Duration.ofHours(24);
    private static final String LOGIN_FAIL_PREFIX = "login:fail:";
    private static final Duration LOGIN_FAIL_TTL = Duration.ofMinutes(10);
    private static final int RECAPTCHA_REQUIRED_AFTER = 3;
    private static final String BLACKLIST_PREFIX = "blacklist:";

    private final UserMapper userMapper;
    private final RefreshTokenMapper refreshTokenMapper;
    private final EmailTokenMapper emailTokenMapper;
    private final TermsAgreementMapper termsAgreementMapper;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicyValidator passwordPolicyValidator;
    private final JwtProvider jwtProvider;
    private final TokenGenerator tokenGenerator;
    private final TokenHasher tokenHasher;
    private final RecaptchaVerifier recaptchaVerifier;
    private final RecaptchaProperties recaptchaProperties;
    private final MailFacade mailFacade;
    private final LoginAuditRecorder loginAuditRecorder;
    private final StringRedisTemplate redisTemplate;

    @Transactional
    public SignupResponse signup(SignupRequest req, String ip) {
        recaptchaVerifier.verify(req.recaptchaToken(), "signup", recaptchaProperties.getThreshold());

        SignupRequest.TermsAgreement terms = req.termsAgreement();
        if (!terms.service() || !terms.privacy()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "필수 약관에 동의해야 합니다.");
        }
        passwordPolicyValidator.validate(req.password(), req.email());

        if (userMapper.findByEmail(req.email()).isPresent()) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        User user = User.builder()
                .email(req.email())
                .password(passwordEncoder.encode(req.password()))
                .nickname(req.nickname())
                .role(UserRole.USER)
                .status(UserStatus.PENDING)
                .plan(UserPlan.FREE)
                .build();
        userMapper.insert(user);

        saveTermsAgreements(user.getId(), terms, ip);

        String rawToken = issueEmailToken(user.getId(), EmailTokenPurpose.VERIFY_EMAIL, VERIFY_TTL);
        mailFacade.sendVerifyEmail(user.getEmail(), user.getNickname(), rawToken);

        return new SignupResponse(user.getId(), user.getEmail());
    }

    @Transactional
    public AuthResult verifyEmail(String token) {
        EmailToken emailToken = emailTokenMapper
                .findByTokenHashAndPurpose(tokenHasher.hash(token), EmailTokenPurpose.VERIFY_EMAIL)
                .orElseThrow(InvalidTokenException::new);
        validateUsableToken(emailToken);

        User user = userMapper.findById(emailToken.getUserId())
                .orElseThrow(InvalidTokenException::new);

        LocalDateTime now = LocalDateTime.now();
        userMapper.updateStatus(user.getId(), UserStatus.ACTIVE);
        userMapper.updateEmailVerifiedAt(user.getId(), now);
        emailTokenMapper.markUsed(emailToken.getId(), now);

        return issueLogin(user, null, null);
    }

    @Transactional
    public AuthResult login(LoginRequest req, String ip, String userAgent) {
        // reCAPTCHA: 같은 이메일 로그인 실패 누적 3회 이상이면 필수
        if (loginFailCount(req.email()) >= RECAPTCHA_REQUIRED_AFTER) {
            recaptchaVerifier.verify(req.recaptchaToken(), "login", recaptchaProperties.getThreshold());
        }

        User user = userMapper.findByEmail(req.email()).orElse(null);
        if (user == null) {
            loginAuditRecorder.record(req.email(), null, false, ip, userAgent, "NOT_FOUND");
            incrementLoginFail(req.email());
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }

        switch (user.getStatus()) {
            case PENDING -> {
                loginAuditRecorder.record(req.email(), user.getId(), false, ip, userAgent, "EMAIL_NOT_VERIFIED");
                throw new BusinessException(ErrorCode.EMAIL_NOT_VERIFIED);
            }
            case SUSPENDED -> {
                loginAuditRecorder.record(req.email(), user.getId(), false, ip, userAgent, "SUSPENDED");
                throw new BusinessException(ErrorCode.ACCOUNT_SUSPENDED,
                        ErrorCode.ACCOUNT_SUSPENDED.getDefaultMessage(),
                        java.util.Map.of("reason", user.getSuspendedReason() == null ? "" : user.getSuspendedReason()));
            }
            case DELETED -> {
                loginAuditRecorder.record(req.email(), user.getId(), false, ip, userAgent, "DELETED");
                throw new BusinessException(ErrorCode.NOT_FOUND);
            }
            default -> { /* ACTIVE: continue */ }
        }

        if (!passwordEncoder.matches(req.password(), user.getPassword())) {
            loginAuditRecorder.record(req.email(), user.getId(), false, ip, userAgent, "WRONG_PASSWORD");
            incrementLoginFail(req.email());
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }

        loginAuditRecorder.record(req.email(), user.getId(), true, ip, userAgent, null);
        userMapper.updateLastLoginAt(user.getId(), LocalDateTime.now());
        resetLoginFail(req.email());

        return issueLogin(user, ip, userAgent);
    }

    @Transactional
    public RefreshResult refresh(String rawRefreshToken, String ip, String userAgent) {
        if (!StringUtils.hasText(rawRefreshToken)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        RefreshToken row = refreshTokenMapper.findByTokenHash(tokenHasher.hash(rawRefreshToken))
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
        if (row.getRevokedAt() != null || row.getExpiredAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        User user = userMapper.findById(row.getUserId())
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));

        // Token Rotation
        refreshTokenMapper.revoke(row.getId(), LocalDateTime.now());
        String newRefresh = issueRefreshToken(user, ip, userAgent);
        String newAccess = jwtProvider.createAccess(user);
        return new RefreshResult(newAccess, newRefresh);
    }

    @Transactional
    public void logout(String rawRefreshToken, String accessToken) {
        if (StringUtils.hasText(rawRefreshToken)) {
            refreshTokenMapper.findByTokenHash(tokenHasher.hash(rawRefreshToken))
                    .ifPresent(row -> refreshTokenMapper.revoke(row.getId(), LocalDateTime.now()));
        }
        if (StringUtils.hasText(accessToken)) {
            blacklistAccessToken(accessToken);
        }
    }

    @Transactional
    public void resendVerification(String email) {
        // 이메일 존재 여부와 무관하게 동일 응답. PENDING 상태일 때만 실제 발송.
        userMapper.findByEmail(email).ifPresent(user -> {
            if (user.getStatus() == UserStatus.PENDING) {
                String rawToken = issueEmailToken(user.getId(), EmailTokenPurpose.VERIFY_EMAIL, VERIFY_TTL);
                mailFacade.sendVerifyEmail(user.getEmail(), user.getNickname(), rawToken);
            }
        });
    }

    // ----------------------------------------------------------------
    // helpers
    // ----------------------------------------------------------------

    private AuthResult issueLogin(User user, String ip, String userAgent) {
        String access = jwtProvider.createAccess(user);
        String refresh = issueRefreshToken(user, ip, userAgent);
        return new AuthResult(LoginResponse.of(access, user), refresh);
    }

    private String issueRefreshToken(User user, String ip, String userAgent) {
        String raw = jwtProvider.createRefresh(user);
        refreshTokenMapper.insert(RefreshToken.builder()
                .userId(user.getId())
                .tokenHash(tokenHasher.hash(raw))
                .userAgent(truncate(userAgent, 255))
                .ip(ip)
                .expiredAt(LocalDateTime.now().plusSeconds(jwtProvider.getRefreshExpirySeconds()))
                .build());
        return raw;
    }

    private String issueEmailToken(Long userId, EmailTokenPurpose purpose, Duration ttl) {
        String raw = tokenGenerator.generate();
        emailTokenMapper.insert(EmailToken.builder()
                .userId(userId)
                .purpose(purpose)
                .tokenHash(tokenHasher.hash(raw))
                .expiredAt(LocalDateTime.now().plus(ttl))
                .build());
        return raw;
    }

    private void saveTermsAgreements(Long userId, SignupRequest.TermsAgreement terms, String ip) {
        // §12.5: 항상 3건 INSERT. 마케팅 거부도 agreed=false로 보존 (법적 입증/재동의 추적).
        // 필수 약관(service/privacy) 미동의는 signup 초입에서 이미 차단됨.
        List<TermsAgreement> rows = List.of(
                buildTerms(userId, TermsType.SERVICE, terms.service(), ip),
                buildTerms(userId, TermsType.PRIVACY, terms.privacy(), ip),
                buildTerms(userId, TermsType.MARKETING, terms.marketing(), ip)
        );
        termsAgreementMapper.insertBatch(rows);
    }

    private TermsAgreement buildTerms(Long userId, TermsType type, boolean agreed, String ip) {
        return TermsAgreement.builder()
                .userId(userId)
                .termsType(type)
                .termsVersion(TERMS_VERSION)
                .agreed(agreed)
                .ip(ip)
                .build();
    }

    private void validateUsableToken(EmailToken token) {
        if (token.getUsedAt() != null || token.getExpiredAt().isBefore(LocalDateTime.now())) {
            throw new InvalidTokenException();
        }
    }

    private void blacklistAccessToken(String accessToken) {
        try {
            Claims claims = jwtProvider.parse(accessToken);
            String jti = claims.getId();
            long remainingMs = claims.getExpiration().getTime() - System.currentTimeMillis();
            if (jti != null && remainingMs > 0) {
                redisTemplate.opsForValue().set(BLACKLIST_PREFIX + jti, "1", Duration.ofMillis(remainingMs));
            }
        } catch (RuntimeException e) {
            // 이미 만료/위조된 토큰이면 블랙리스트 불필요
            log.debug("[LOGOUT] skip blacklist: {}", e.getMessage());
        }
    }

    private long loginFailCount(String email) {
        String v = redisTemplate.opsForValue().get(LOGIN_FAIL_PREFIX + email);
        return v == null ? 0 : Long.parseLong(v);
    }

    private void incrementLoginFail(String email) {
        String key = LOGIN_FAIL_PREFIX + email;
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1L) {
            redisTemplate.expire(key, LOGIN_FAIL_TTL);
        }
    }

    private void resetLoginFail(String email) {
        redisTemplate.delete(LOGIN_FAIL_PREFIX + email);
    }

    private static String truncate(String s, int max) {
        return s == null ? null : (s.length() > max ? s.substring(0, max) : s);
    }
}
