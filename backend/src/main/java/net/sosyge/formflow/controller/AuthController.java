package net.sosyge.formflow.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.common.ApiResponse;
import net.sosyge.formflow.common.CookieUtil;
import net.sosyge.formflow.dto.request.auth.LoginRequest;
import net.sosyge.formflow.dto.request.auth.PasswordResetConfirmRequest;
import net.sosyge.formflow.dto.request.auth.PasswordResetRequestDto;
import net.sosyge.formflow.dto.request.auth.ResendVerificationRequest;
import net.sosyge.formflow.dto.request.auth.SignupRequest;
import net.sosyge.formflow.dto.request.auth.VerifyEmailRequest;
import net.sosyge.formflow.dto.response.auth.AccessTokenResponse;
import net.sosyge.formflow.dto.response.auth.LoginResponse;
import net.sosyge.formflow.dto.response.auth.SignupResponse;
import net.sosyge.formflow.service.AuthResult;
import net.sosyge.formflow.service.AuthService;
import net.sosyge.formflow.service.PasswordResetService;
import net.sosyge.formflow.service.RefreshResult;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final CookieUtil cookieUtil;

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<SignupResponse>> signup(@Valid @RequestBody SignupRequest req,
                                                              HttpServletRequest http) {
        SignupResponse data = authService.signup(req, clientIp(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(data));
    }

    @PostMapping("/verify-email")
    public ApiResponse<LoginResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest req,
                                                  HttpServletResponse res) {
        AuthResult result = authService.verifyEmail(req.token());
        setRefreshCookie(res, result.refreshToken());
        return ApiResponse.ok(result.login());
    }

    @PostMapping("/resend-verification")
    public ApiResponse<Void> resendVerification(@Valid @RequestBody ResendVerificationRequest req) {
        authService.resendVerification(req.email());
        return ApiResponse.ok();
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest req,
                                            HttpServletRequest http, HttpServletResponse res) {
        AuthResult result = authService.login(req, clientIp(http), http.getHeader("User-Agent"));
        setRefreshCookie(res, result.refreshToken());
        return ApiResponse.ok(result.login());
    }

    @PostMapping("/refresh")
    public ApiResponse<AccessTokenResponse> refresh(
            @CookieValue(name = CookieUtil.REFRESH_COOKIE, required = false) String refreshToken,
            HttpServletRequest http, HttpServletResponse res) {
        RefreshResult result = authService.refresh(refreshToken, clientIp(http), http.getHeader("User-Agent"));
        setRefreshCookie(res, result.refreshToken());
        return ApiResponse.ok(new AccessTokenResponse(result.accessToken()));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(
            @CookieValue(name = CookieUtil.REFRESH_COOKIE, required = false) String refreshToken,
            @RequestHeader(name = "Authorization", required = false) String authorization,
            HttpServletResponse res) {
        authService.logout(refreshToken, bearer(authorization));
        res.addHeader(HttpHeaders.SET_COOKIE, cookieUtil.clear().toString());
        return ApiResponse.ok();
    }

    @PostMapping("/password-reset/request")
    public ApiResponse<Void> passwordResetRequest(@Valid @RequestBody PasswordResetRequestDto req) {
        passwordResetService.request(req.email());
        return ApiResponse.ok();
    }

    @PostMapping("/password-reset/confirm")
    public ApiResponse<Void> passwordResetConfirm(@Valid @RequestBody PasswordResetConfirmRequest req) {
        passwordResetService.confirm(req.token(), req.newPassword());
        return ApiResponse.ok();
    }

    // ----------------------------------------------------------------

    private void setRefreshCookie(HttpServletResponse res, String refreshToken) {
        res.addHeader(HttpHeaders.SET_COOKIE, cookieUtil.create(refreshToken).toString());
    }

    private static String bearer(String authorization) {
        if (StringUtils.hasText(authorization) && authorization.startsWith("Bearer ")) {
            return authorization.substring("Bearer ".length());
        }
        return null;
    }

    private static String clientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(xff)) {
            return xff.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }
}
