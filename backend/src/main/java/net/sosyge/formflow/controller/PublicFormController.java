package net.sosyge.formflow.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.common.ApiResponse;
import net.sosyge.formflow.dto.request.publicform.ReportFormRequest;
import net.sosyge.formflow.dto.request.publicform.SubmitRequest;
import net.sosyge.formflow.dto.response.publicform.PublicFormResponse;
import net.sosyge.formflow.security.CustomUserDetails;
import net.sosyge.formflow.service.PublicFormService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/f")
@RequiredArgsConstructor
public class PublicFormController {

    private final PublicFormService publicFormService;

    @GetMapping("/{slug}")
    public ApiResponse<PublicFormResponse> getPublicForm(@PathVariable String slug) {
        return ApiResponse.ok(publicFormService.getPublicForm(slug));
    }

    @PostMapping("/{slug}/submit")
    public ResponseEntity<ApiResponse<Void>> submit(
            @PathVariable String slug,
            @Valid @RequestBody SubmitRequest req,
            @RequestHeader(name = "X-Recaptcha-Token", required = false) String recaptchaToken,
            HttpServletRequest http) {
        publicFormService.submit(slug, req, recaptchaToken, clientIp(http), http.getHeader("User-Agent"));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok());
    }

    @PostMapping("/{slug}/report")
    public ResponseEntity<ApiResponse<Void>> report(
            @PathVariable String slug,
            @Valid @RequestBody ReportFormRequest req,
            @AuthenticationPrincipal CustomUserDetails user,
            HttpServletRequest http) {
        Long userId = user != null ? user.getId() : null;
        publicFormService.report(slug, req, clientIp(http), userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok());
    }

    private static String clientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(xff)) {
            return xff.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }
}
