package net.sosyge.formflow.controller.admin;

import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.common.ApiResponse;
import net.sosyge.formflow.dto.response.admin.AdminDashboardResponse;
import net.sosyge.formflow.service.admin.AdminDashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 관리자 대시보드 API (§10.3, hasRole('ADMIN')). */
@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    @GetMapping
    public ApiResponse<AdminDashboardResponse> dashboard() {
        return ApiResponse.ok(adminDashboardService.getDashboard());
    }
}
