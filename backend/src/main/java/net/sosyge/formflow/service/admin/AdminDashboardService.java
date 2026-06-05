package net.sosyge.formflow.service.admin;

import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.domain.ReportStatus;
import net.sosyge.formflow.dto.response.admin.AdminAuditItem;
import net.sosyge.formflow.dto.response.admin.AdminDashboardResponse;
import net.sosyge.formflow.dto.response.admin.DailyCount;
import net.sosyge.formflow.mapper.AdminAuditMapper;
import net.sosyge.formflow.mapper.FormReportMapper;
import net.sosyge.formflow.mapper.ResponseMapper;
import net.sosyge.formflow.mapper.UserMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** 관리자 대시보드 위젯 (§10.3). */
@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private static final int RECENT_DAYS = 7;
    private static final int RECENT_AUDITS = 10;
    private static final DateTimeFormatter DAY_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final UserMapper userMapper;
    private final ResponseMapper responseMapper;
    private final FormReportMapper formReportMapper;
    private final AdminAuditMapper adminAuditMapper;

    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboard() {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfToday = today.atStartOfDay();
        LocalDateTime startOfTomorrow = today.plusDays(1).atStartOfDay();
        LocalDateTime since = today.minusDays(RECENT_DAYS - 1L).atStartOfDay();

        long todaySignups = userMapper.countCreatedBetween(startOfToday, startOfTomorrow);
        long todayResponses = responseMapper.countSubmittedBetween(startOfToday, startOfTomorrow);
        long pendingReports = formReportMapper.countByStatus(ReportStatus.PENDING);

        List<DailyCount> signups = fillSeries(userMapper.dailySignupsSince(since), today);
        List<DailyCount> responses = fillSeries(responseMapper.dailyResponsesSince(since), today);

        List<AdminAuditItem> recentAudits = adminAuditMapper.findRecent(RECENT_AUDITS);

        return new AdminDashboardResponse(
                todaySignups, todayResponses, pendingReports, signups, responses, recentAudits);
    }

    /** DB의 일자별 집계를 최근 7일 연속 시계열로 채운다 (빈 날 = 0). */
    private List<DailyCount> fillSeries(List<DailyCount> raw, LocalDate today) {
        Map<String, Long> byDay = raw.stream()
                .collect(Collectors.toMap(DailyCount::day, DailyCount::count, (a, b) -> a));
        return java.util.stream.IntStream.range(0, RECENT_DAYS)
                .mapToObj(i -> today.minusDays(RECENT_DAYS - 1L - i))
                .map(d -> {
                    String key = d.format(DAY_FMT);
                    return new DailyCount(key, byDay.getOrDefault(key, 0L));
                })
                .collect(Collectors.toList());
    }
}
