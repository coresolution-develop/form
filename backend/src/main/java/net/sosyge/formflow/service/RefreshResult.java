package net.sosyge.formflow.service;

/** 토큰 갱신 결과 (서비스 내부 전용). refreshToken은 쿠키로만 내보낸다. */
public record RefreshResult(String accessToken, String refreshToken) {}
