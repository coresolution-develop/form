package net.sosyge.formflow.controller.admin;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.common.ApiResponse;
import net.sosyge.formflow.common.ClientIps;
import net.sosyge.formflow.common.CurrentUser;
import net.sosyge.formflow.common.PageResponse;
import net.sosyge.formflow.dto.request.admin.AdminForceCloseRequest;
import net.sosyge.formflow.dto.response.admin.AdminFormItem;
import net.sosyge.formflow.security.CustomUserDetails;
import net.sosyge.formflow.service.admin.AdminFormService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 관리자 폼 관리 API (§7.10, hasRole('ADMIN')). */
@RestController
@RequestMapping("/api/admin/forms")
@RequiredArgsConstructor
public class AdminFormController {

    private final AdminFormService adminFormService;

    @GetMapping
    public ApiResponse<PageResponse<AdminFormItem>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String keyword) {
        // title 또는 keyword 어느 쪽이든 검색어로 사용 (slug/title/email 통합 검색)
        String q = keyword != null ? keyword : title;
        return ApiResponse.ok(adminFormService.getForms(q, page, size));
    }

    @GetMapping("/{id}")
    public ApiResponse<net.sosyge.formflow.dto.response.form.FormDetailResponse> detail(@PathVariable Long id) {
        return ApiResponse.ok(adminFormService.getFormDetail(id));
    }

    @PatchMapping("/{id}/force-close")
    public ApiResponse<Void> forceClose(@CurrentUser CustomUserDetails admin,
                                        @PathVariable Long id,
                                        @Valid @RequestBody AdminForceCloseRequest req,
                                        HttpServletRequest http) {
        adminFormService.forceClose(admin.getId(), id, req.reason(), ClientIps.resolve(http));
        return ApiResponse.ok();
    }
}
