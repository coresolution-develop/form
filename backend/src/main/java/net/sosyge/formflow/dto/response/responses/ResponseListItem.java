package net.sosyge.formflow.dto.response.responses;

import java.time.LocalDateTime;
import java.util.List;

/** §7.8 응답 목록 항목. */
public record ResponseListItem(
        Long id,
        String respondentKey,
        LocalDateTime submittedAt,
        List<Answer> answers
) {
    public record Answer(Long fieldId, String label, String value) {}
}
