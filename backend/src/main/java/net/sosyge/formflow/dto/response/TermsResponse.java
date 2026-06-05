package net.sosyge.formflow.dto.response;

/** §7.9 약관 응답. */
public record TermsResponse(
        String type,
        String version,
        String title,
        String contentHtml,
        String effectiveAt
) {}
