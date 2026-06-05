package net.sosyge.formflow.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.common.ApiResponse;
import net.sosyge.formflow.common.CurrentUser;
import net.sosyge.formflow.common.PageResponse;
import net.sosyge.formflow.dto.request.form.FormCreateRequest;
import net.sosyge.formflow.dto.request.form.FormStatusRequest;
import net.sosyge.formflow.dto.request.form.FormUpdateRequest;
import net.sosyge.formflow.dto.response.form.FormDetailResponse;
import net.sosyge.formflow.dto.response.form.FormSummaryResponse;
import net.sosyge.formflow.security.CustomUserDetails;
import net.sosyge.formflow.service.FormService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/forms")
@RequiredArgsConstructor
public class FormController {

    private final FormService formService;

    @GetMapping
    public ApiResponse<PageResponse<FormSummaryResponse>> list(
            @CurrentUser CustomUserDetails user,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(formService.getList(user.getId(), page, size));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<FormDetailResponse>> create(
            @CurrentUser CustomUserDetails user,
            @Valid @RequestBody FormCreateRequest req) {
        FormDetailResponse data = formService.create(user.getId(), req);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(data));
    }

    @GetMapping("/{id}")
    public ApiResponse<FormDetailResponse> detail(@CurrentUser CustomUserDetails user,
                                                  @PathVariable Long id) {
        return ApiResponse.ok(formService.getDetail(user.getId(), id));
    }

    @PatchMapping("/{id}")
    public ApiResponse<FormDetailResponse> update(@CurrentUser CustomUserDetails user,
                                                  @PathVariable Long id,
                                                  @Valid @RequestBody FormUpdateRequest req) {
        return ApiResponse.ok(formService.update(user.getId(), id, req));
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<Void> updateStatus(@CurrentUser CustomUserDetails user,
                                          @PathVariable Long id,
                                          @Valid @RequestBody FormStatusRequest req) {
        formService.updateStatus(user.getId(), id, req);
        return ApiResponse.ok();
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@CurrentUser CustomUserDetails user, @PathVariable Long id) {
        formService.delete(user.getId(), id);
        return ApiResponse.ok();
    }
}
