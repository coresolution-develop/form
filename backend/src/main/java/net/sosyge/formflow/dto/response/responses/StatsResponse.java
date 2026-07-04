package net.sosyge.formflow.dto.response.responses;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/** §7.8 통계. 선택형은 distribution, 텍스트형은 sampleAnswers (둘 중 하나만 채움). */
public record StatsResponse(
        long totalResponses,
        List<FieldStat> fields
) {
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record FieldStat(
            Long fieldId,
            String label,
            String type,
            long answeredCount,
            List<Distribution> distribution,
            List<String> sampleAnswers,
            NumberStats numberStats
    ) {}

    public record Distribution(String value, long count, double ratio) {}

    /** 숫자형 집계. */
    public record NumberStats(long count, double average, double min, double max, double sum) {}
}
