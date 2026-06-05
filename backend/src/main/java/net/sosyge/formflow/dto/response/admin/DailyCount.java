package net.sosyge.formflow.dto.response.admin;

/** 일자별 집계 (대시보드 최근 7일 차트, §10.3). day 형식: yyyy-MM-dd. */
public record DailyCount(
        String day,
        long count
) {}
