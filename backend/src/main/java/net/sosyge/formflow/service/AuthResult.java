package net.sosyge.formflow.service;

import net.sosyge.formflow.dto.response.auth.LoginResponse;

/**
 * 로그인/이메일인증 결과 (서비스 내부 전용).
 * refreshToken 원본은 컨트롤러가 쿠키로만 내보내며, 응답 바디에 노출하지 않는다.
 */
public record AuthResult(LoginResponse login, String refreshToken) {}
