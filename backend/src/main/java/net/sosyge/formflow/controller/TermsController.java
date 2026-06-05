package net.sosyge.formflow.controller;

import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.common.ApiResponse;
import net.sosyge.formflow.dto.response.TermsResponse;
import net.sosyge.formflow.service.TermsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/terms")
@RequiredArgsConstructor
public class TermsController {

    private final TermsService termsService;

    @GetMapping("/{type}")
    public ApiResponse<TermsResponse> getTerms(@PathVariable String type) {
        return ApiResponse.ok(termsService.getTerms(type));
    }
}
