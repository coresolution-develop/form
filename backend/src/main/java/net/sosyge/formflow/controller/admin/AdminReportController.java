package net.sosyge.formflow.controller.admin;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.common.ApiResponse;
import net.sosyge.formflow.common.ClientIps;
import net.sosyge.formflow.common.CurrentUser;
import net.sosyge.formflow.common.PageResponse;
import net.sosyge.formflow.domain.ReportStatus;
import net.sosyge.formflow.dto.request.admin.AdminReportUpdateRequest;
import net.sosyge.formflow.dto.response.admin.AdminReportItem;
import net.sosyge.formflow.security.CustomUserDetails;
import net.sosyge.formflow.service.admin.AdminReportService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 관리자 신고 처리 API (§7.10, hasRole('ADMIN')). */
@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
public class AdminReportController {

    private final AdminReportService adminReportService;

    @GetMapping
    public ApiResponse<PageResponse<AdminReportItem>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) ReportStatus status) {
        return ApiResponse.ok(adminReportService.getReports(status, page, size));
    }

    @PatchMapping("/{id}")
    public ApiResponse<Void> update(@CurrentUser CustomUserDetails admin,
                                    @PathVariable Long id,
                                    @Valid @RequestBody AdminReportUpdateRequest req,
                                    HttpServletRequest http) {
        adminReportService.updateReport(admin.getId(), id, req.status(), req.detail(),
                req.closeForm(), ClientIps.resolve(http));
        return ApiResponse.ok();
    }
}
