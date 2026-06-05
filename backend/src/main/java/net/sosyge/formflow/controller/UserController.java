package net.sosyge.formflow.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.common.ApiResponse;
import net.sosyge.formflow.dto.request.user.DeleteMeRequest;
import net.sosyge.formflow.dto.request.user.UpdateMeRequest;
import net.sosyge.formflow.dto.request.user.UpdatePasswordRequest;
import net.sosyge.formflow.dto.response.auth.MeResponse;
import net.sosyge.formflow.security.CustomUserDetails;
import net.sosyge.formflow.service.UserService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ApiResponse<MeResponse> getMe(@AuthenticationPrincipal CustomUserDetails principal) {
        return ApiResponse.ok(userService.getMe(principal.getId()));
    }

    @PatchMapping("/me")
    public ApiResponse<MeResponse> updateMe(@AuthenticationPrincipal CustomUserDetails principal,
                                            @Valid @RequestBody UpdateMeRequest req) {
        return ApiResponse.ok(userService.updateMe(principal.getId(), req.nickname()));
    }

    @PatchMapping("/me/password")
    public ApiResponse<Void> updatePassword(@AuthenticationPrincipal CustomUserDetails principal,
                                            @Valid @RequestBody UpdatePasswordRequest req) {
        userService.updatePassword(principal.getId(), req.currentPassword(), req.newPassword());
        return ApiResponse.ok();
    }

    @DeleteMapping("/me")
    public ApiResponse<Void> deleteMe(@AuthenticationPrincipal CustomUserDetails principal,
                                      @Valid @RequestBody DeleteMeRequest req) {
        userService.deleteMe(principal.getId(), req.password());
        return ApiResponse.ok();
    }
}
