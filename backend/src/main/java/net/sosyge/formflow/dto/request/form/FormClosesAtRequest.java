package net.sosyge.formflow.dto.request.form;

import java.time.LocalDateTime;

/** PATCH /api/forms/{id}/closes-at — 마감 예정 시각 설정/해제(null=무기한). */
public record FormClosesAtRequest(
        LocalDateTime closesAt
) {}
