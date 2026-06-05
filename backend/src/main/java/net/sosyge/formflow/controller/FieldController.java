package net.sosyge.formflow.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.common.ApiResponse;
import net.sosyge.formflow.common.CurrentUser;
import net.sosyge.formflow.dto.request.field.FieldCreateRequest;
import net.sosyge.formflow.dto.request.field.FieldOrderRequest;
import net.sosyge.formflow.dto.request.field.FieldUpdateRequest;
import net.sosyge.formflow.dto.response.field.FieldResponse;
import net.sosyge.formflow.security.CustomUserDetails;
import net.sosyge.formflow.service.FieldService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/forms/{formId}/fields")
@RequiredArgsConstructor
public class FieldController {

    private final FieldService fieldService;

    @PostMapping
    public ResponseEntity<ApiResponse<FieldResponse>> create(
            @CurrentUser CustomUserDetails user,
            @PathVariable Long formId,
            @Valid @RequestBody FieldCreateRequest req) {
        FieldResponse data = fieldService.create(user.getId(), formId, req);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(data));
    }

    @PatchMapping("/{fieldId}")
    public ApiResponse<FieldResponse> update(@CurrentUser CustomUserDetails user,
                                             @PathVariable Long formId,
                                             @PathVariable Long fieldId,
                                             @Valid @RequestBody FieldUpdateRequest req) {
        return ApiResponse.ok(fieldService.update(user.getId(), formId, fieldId, req));
    }

    @PatchMapping("/order")
    public ApiResponse<Void> reorder(@CurrentUser CustomUserDetails user,
                                     @PathVariable Long formId,
                                     @Valid @RequestBody FieldOrderRequest req) {
        fieldService.reorder(user.getId(), formId, req);
        return ApiResponse.ok();
    }

    @DeleteMapping("/{fieldId}")
    public ApiResponse<Void> delete(@CurrentUser CustomUserDetails user,
                                    @PathVariable Long formId,
                                    @PathVariable Long fieldId) {
        fieldService.delete(user.getId(), formId, fieldId);
        return ApiResponse.ok();
    }
}
