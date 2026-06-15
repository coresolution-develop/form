package net.sosyge.formflow.controller.admin;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.common.ApiResponse;
import net.sosyge.formflow.common.ClientIps;
import net.sosyge.formflow.common.CurrentUser;
import net.sosyge.formflow.common.PageResponse;
import net.sosyge.formflow.domain.UserStatus;
import net.sosyge.formflow.dto.request.admin.AdminUserStatusRequest;
import net.sosyge.formflow.dto.response.admin.AdminUserItem;
import net.sosyge.formflow.security.CustomUserDetails;
import net.sosyge.formflow.service.admin.AdminUserService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 관리자 사용자 관리 API (§7.10, hasRole('ADMIN')). */
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping
    public ApiResponse<PageResponse<AdminUserItem>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) UserStatus status,
            @RequestParam(required = false) String email) {
        return ApiResponse.ok(adminUserService.getUsers(status, email, page, size));
    }

    @GetMapping("/{id}")
    public ApiResponse<net.sosyge.formflow.dto.response.admin.AdminUserDetail> detail(@PathVariable Long id) {
        return ApiResponse.ok(adminUserService.getUserDetail(id));
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<Void> updateStatus(@CurrentUser CustomUserDetails admin,
                                          @PathVariable Long id,
                                          @Valid @RequestBody AdminUserStatusRequest req,
                                          HttpServletRequest http) {
        adminUserService.updateUserStatus(admin.getId(), id, req.status(), req.reason(),
                ClientIps.resolve(http));
        return ApiResponse.ok();
    }
}
