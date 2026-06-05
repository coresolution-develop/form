package net.sosyge.formflow.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.sosyge.formflow.common.PageResponse;
import net.sosyge.formflow.domain.FieldType;
import net.sosyge.formflow.domain.Form;
import net.sosyge.formflow.domain.FormField;
import net.sosyge.formflow.domain.Response;
import net.sosyge.formflow.domain.ResponseItem;
import net.sosyge.formflow.dto.response.responses.ResponseListItem;
import net.sosyge.formflow.dto.response.responses.StatsResponse;
import net.sosyge.formflow.exception.BusinessException;
import net.sosyge.formflow.exception.ErrorCode;
import net.sosyge.formflow.mapper.FieldMapper;
import net.sosyge.formflow.mapper.FormMapper;
import net.sosyge.formflow.mapper.ResponseItemMapper;
import net.sosyge.formflow.mapper.ResponseMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResponseService {

    private static final int SAMPLE_LIMIT = 10;
    private static final TypeReference<List<String>> STR_LIST = new TypeReference<>() {};

    private final FormMapper formMapper;
    private final FieldMapper fieldMapper;
    private final ResponseMapper responseMapper;
    private final ResponseItemMapper responseItemMapper;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public PageResponse<ResponseListItem> getResponses(Long formId, Long userId, int page, int size) {
        loadOwnedForm(formId, userId);
        List<FormField> fields = fieldMapper.findByFormIdOrderByOrderNum(formId);
        Map<Long, String> labels = fields.stream()
                .collect(Collectors.toMap(FormField::getId, FormField::getLabel, (a, b) -> a));

        List<Response> responses = responseMapper.findPageByFormId(formId, (page - 1) * size, size);
        long total = responseMapper.countByFormId(formId);

        // N+1 방지: 응답 ID 일괄 → items 한 번에 조회 → 메모리 그룹핑
        List<Long> ids = responses.stream().map(Response::getId).toList();
        Map<Long, Map<Long, String>> itemsByResponse = new LinkedHashMap<>();
        if (!ids.isEmpty()) {
            for (ResponseItem it : responseItemMapper.findByResponseIds(ids)) {
                itemsByResponse
                        .computeIfAbsent(it.getResponseId(), k -> new LinkedHashMap<>())
                        .put(it.getFieldId(), it.getValue());
            }
        }

        List<ResponseListItem> items = responses.stream().map(r -> {
            Map<Long, String> valueMap = itemsByResponse.getOrDefault(r.getId(), Map.of());
            List<ResponseListItem.Answer> answers = new ArrayList<>();
            for (FormField f : fields) {
                if (valueMap.containsKey(f.getId())) {
                    answers.add(new ResponseListItem.Answer(f.getId(), labels.get(f.getId()), valueMap.get(f.getId())));
                }
            }
            return new ResponseListItem(r.getId(), r.getRespondentKey(), r.getSubmittedAt(), answers);
        }).toList();

        return PageResponse.of(items, page, size, total);
    }

    @Transactional(readOnly = true)
    public StatsResponse getStats(Long formId, Long userId) {
        loadOwnedForm(formId, userId);
        List<FormField> fields = fieldMapper.findByFormIdOrderByOrderNum(formId);
        long total = responseMapper.countByFormId(formId);

        // field_id → 응답 value 목록 (최신순)
        Map<Long, List<String>> byField = new LinkedHashMap<>();
        for (ResponseItem it : responseItemMapper.findByFormId(formId)) {
            byField.computeIfAbsent(it.getFieldId(), k -> new ArrayList<>()).add(it.getValue());
        }

        List<StatsResponse.FieldStat> fieldStats = fields.stream().map(f -> {
            List<String> values = byField.getOrDefault(f.getId(), List.of());
            if (f.getType() == FieldType.SINGLE || f.getType() == FieldType.MULTI) {
                return new StatsResponse.FieldStat(f.getId(), f.getLabel(), f.getType().name(),
                        distribution(f, values), null);
            }
            List<String> samples = values.stream()
                    .filter(StringUtils::hasText)
                    .limit(SAMPLE_LIMIT)
                    .toList();
            return new StatsResponse.FieldStat(f.getId(), f.getLabel(), f.getType().name(), null, samples);
        }).toList();

        return new StatsResponse(total, fieldStats);
    }

    /** SINGLE: value별 카운트. MULTI: JSON 파싱 후 옵션별(응답당 1회) 카운트. ratio=count/응답수. */
    private List<StatsResponse.Distribution> distribution(FormField field, List<String> values) {
        long responded = values.stream().filter(StringUtils::hasText).count();
        Map<String, Long> counts = new LinkedHashMap<>();
        List<String> options = field.getOptions() == null ? List.of() : field.getOptions();
        options.forEach(o -> counts.put(o, 0L));

        for (String v : values) {
            if (!StringUtils.hasText(v)) continue;
            if (field.getType() == FieldType.MULTI) {
                for (String opt : Set.copyOf(parseMulti(v))) { // 응답당 옵션 중복 제거
                    counts.merge(opt, 1L, Long::sum);
                }
            } else {
                counts.merge(v, 1L, Long::sum);
            }
        }

        return counts.entrySet().stream()
                .map(e -> new StatsResponse.Distribution(
                        e.getKey(), e.getValue(),
                        responded == 0 ? 0.0 : Math.round((double) e.getValue() / responded * 10000.0) / 10000.0))
                .toList();
    }

    private List<String> parseMulti(String v) {
        String s = v.trim();
        if (s.startsWith("[")) {
            try {
                return objectMapper.readValue(s, STR_LIST);
            } catch (Exception ignored) {
                // fall through
            }
        }
        return List.of(s.split("\\s*,\\s*"));
    }

    Form loadOwnedForm(Long formId, Long userId) {
        Form form = formMapper.findByIdActive(formId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!form.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return form;
    }
}
