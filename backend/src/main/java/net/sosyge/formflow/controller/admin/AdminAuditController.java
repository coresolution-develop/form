package net.sosyge.formflow.controller.admin;

import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.common.ApiResponse;
import net.sosyge.formflow.common.PageResponse;
import net.sosyge.formflow.dto.response.admin.AdminAuditItem;
import net.sosyge.formflow.service.admin.AdminAuditService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 관리자 감사 로그 API (§7.10, hasRole('ADMIN')). */
@RestController
@RequestMapping("/api/admin/audits")
@RequiredArgsConstructor
public class AdminAuditController {

    private final AdminAuditService adminAuditService;

    @GetMapping
    public ApiResponse<PageResponse<AdminAuditItem>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String targetType) {
        return ApiResponse.ok(adminAuditService.getAudits(targetType, page, size));
    }
}
