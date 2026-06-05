package net.sosyge.formflow.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import net.sosyge.formflow.domain.FieldType;
import net.sosyge.formflow.domain.FormField;
import net.sosyge.formflow.domain.Response;
import net.sosyge.formflow.domain.ResponseItem;
import net.sosyge.formflow.mapper.FieldMapper;
import net.sosyge.formflow.mapper.ResponseItemMapper;
import net.sosyge.formflow.mapper.ResponseMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 응답 CSV export (§7.8). UTF-8 BOM 선두로 Excel 한글 깨짐 방지 (§16.3-7). */
@Service
@RequiredArgsConstructor
public class CsvExportService {

    private static final String BOM = "\uFEFF";
    private static final DateTimeFormatter DT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final TypeReference<List<String>> STR_LIST = new TypeReference<>() {};

    private final ResponseService responseService; // 소유권 검증 재사용
    private final FieldMapper fieldMapper;
    private final ResponseMapper responseMapper;
    private final ResponseItemMapper responseItemMapper;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public byte[] export(Long formId, Long userId) {
        responseService.loadOwnedForm(formId, userId); // 403/404 처리

        List<FormField> fields = fieldMapper.findByFormIdOrderByOrderNum(formId);
        List<Response> responses = responseMapper.findAllByFormId(formId);

        Map<Long, Map<Long, String>> itemsByResponse = new LinkedHashMap<>();
        for (ResponseItem it : responseItemMapper.findByFormId(formId)) {
            itemsByResponse
                    .computeIfAbsent(it.getResponseId(), k -> new LinkedHashMap<>())
                    .put(it.getFieldId(), it.getValue());
        }

        StringBuilder sb = new StringBuilder(BOM);
        // 헤더
        sb.append(escape("응답ID")).append(',').append(escape("제출시각"));
        for (FormField f : fields) {
            sb.append(',').append(escape(f.getLabel()));
        }
        sb.append("\r\n");

        // 행
        for (Response r : responses) {
            Map<Long, String> valueMap = itemsByResponse.getOrDefault(r.getId(), Map.of());
            sb.append(escape(String.valueOf(r.getId())))
                    .append(',')
                    .append(escape(r.getSubmittedAt() == null ? "" : r.getSubmittedAt().format(DT)));
            for (FormField f : fields) {
                String raw = valueMap.get(f.getId());
                sb.append(',').append(escape(displayValue(f, raw)));
            }
            sb.append("\r\n");
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    /** MULTI는 JSON 파싱 후 ", "로 join. 나머지는 원본. */
    private String displayValue(FormField field, String raw) {
        if (raw == null) return "";
        if (field.getType() == FieldType.MULTI && raw.trim().startsWith("[")) {
            try {
                return String.join(", ", objectMapper.readValue(raw, STR_LIST));
            } catch (Exception ignored) {
                // fall through to raw
            }
        }
        return raw;
    }

    /** RFC 4180: 콤마/따옴표/개행 포함 시 따옴표로 감싸고 내부 따옴표는 "". */
    private String escape(String v) {
        if (v == null) return "";
        boolean needQuote = v.contains(",") || v.contains("\"") || v.contains("\n") || v.contains("\r");
        if (!needQuote) return v;
        return "\"" + v.replace("\"", "\"\"") + "\"";
    }
}
