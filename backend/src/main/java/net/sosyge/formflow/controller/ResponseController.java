package net.sosyge.formflow.controller;

import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.common.ApiResponse;
import net.sosyge.formflow.common.CurrentUser;
import net.sosyge.formflow.common.PageResponse;
import net.sosyge.formflow.dto.response.responses.ResponseListItem;
import net.sosyge.formflow.dto.response.responses.StatsResponse;
import net.sosyge.formflow.security.CustomUserDetails;
import net.sosyge.formflow.service.CsvExportService;
import net.sosyge.formflow.service.ResponseService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/forms/{id}")
@RequiredArgsConstructor
public class ResponseController {

    private final ResponseService responseService;
    private final CsvExportService csvExportService;

    @GetMapping("/responses")
    public ApiResponse<PageResponse<ResponseListItem>> getResponses(
            @CurrentUser CustomUserDetails user,
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(responseService.getResponses(id, user.getId(), page, size));
    }

    @GetMapping("/stats")
    public ApiResponse<StatsResponse> getStats(@CurrentUser CustomUserDetails user, @PathVariable Long id) {
        return ApiResponse.ok(responseService.getStats(id, user.getId()));
    }

    @GetMapping("/responses/export")
    public ResponseEntity<byte[]> export(@CurrentUser CustomUserDetails user, @PathVariable Long id) {
        byte[] csv = csvExportService.export(id, user.getId());
        String filename = "form-" + id + "-responses-" + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE) + ".csv";
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(csv);
    }
}
