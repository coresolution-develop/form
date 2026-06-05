package net.sosyge.formflow.security;

import net.sosyge.formflow.exception.BusinessException;
import net.sosyge.formflow.exception.ErrorCode;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * 비밀번호 정책 검증 (§6.10).
 * - 8자 이상 64자 이하
 * - 영문 대/소문자, 숫자, 특수문자 중 3종류 이상 포함
 * - 이메일과 동일 금지
 */
@Component
public class PasswordPolicyValidator {

    private static final String MESSAGE =
            "비밀번호는 8자 이상이며 영문/숫자/특수문자 중 3종류 이상 포함해야 합니다.";

    public void validate(String password, String email) {
        if (!StringUtils.hasText(password) || password.length() < 8 || password.length() > 64) {
            throw new BusinessException(ErrorCode.PASSWORD_POLICY, MESSAGE);
        }
        if (email != null && password.equalsIgnoreCase(email)) {
            throw new BusinessException(ErrorCode.PASSWORD_POLICY, MESSAGE);
        }
        int kinds = 0;
        if (password.matches(".*[a-z].*")) kinds++;
        if (password.matches(".*[A-Z].*")) kinds++;
        if (password.matches(".*\\d.*")) kinds++;
        if (password.matches(".*[^a-zA-Z0-9].*")) kinds++;
        if (kinds < 3) {
            throw new BusinessException(ErrorCode.PASSWORD_POLICY, MESSAGE);
        }
    }
}
