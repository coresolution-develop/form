package net.sosyge.formflow.service;

import lombok.extern.slf4j.Slf4j;
import net.sosyge.formflow.dto.response.TermsResponse;
import net.sosyge.formflow.exception.BusinessException;
import net.sosyge.formflow.exception.ErrorCode;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.yaml.snakeyaml.Yaml;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * 약관 조회 (§7.9, §12.2).
 * resources/terms/{type}/meta.yml 의 current 버전을 읽어 {version}.md 를 HTML로 변환해 반환.
 */
@Slf4j
@Service
public class TermsService {

    private static final Set<String> ALLOWED = Set.of("service", "privacy", "marketing");

    @SuppressWarnings("unchecked")
    public TermsResponse getTerms(String typeRaw) {
        String type = typeRaw == null ? "" : typeRaw.toLowerCase(Locale.ROOT);
        if (!ALLOWED.contains(type)) {
            throw new BusinessException(ErrorCode.NOT_FOUND);
        }

        Map<String, Object> meta = loadMeta(type);
        String current = String.valueOf(meta.get("current"));

        String title = type;
        String effectiveAt = null;
        Object versionsObj = meta.get("versions");
        if (versionsObj instanceof List<?> versions) {
            for (Object o : versions) {
                if (o instanceof Map<?, ?> v && current.equals(String.valueOf(v.get("version")))) {
                    title = String.valueOf(v.get("title"));
                    effectiveAt = v.get("effectiveAt") == null ? null : String.valueOf(v.get("effectiveAt"));
                    break;
                }
            }
        }

        String markdown = loadMarkdown(type, current);
        String html = toHtml(markdown);

        return new TermsResponse(type, current, title, html, effectiveAt);
    }

    private Map<String, Object> loadMeta(String type) {
        try (InputStream is = new ClassPathResource("terms/" + type + "/meta.yml").getInputStream()) {
            Map<String, Object> map = new Yaml().load(is);
            if (map == null) {
                throw new BusinessException(ErrorCode.NOT_FOUND);
            }
            return map;
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.NOT_FOUND);
        }
    }

    private String loadMarkdown(String type, String version) {
        try (InputStream is = new ClassPathResource("terms/" + type + "/" + version + ".md").getInputStream()) {
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.NOT_FOUND);
        }
    }

    /** 최소 Markdown → HTML 변환 (heading/list/paragraph). 약관 파일은 신뢰된 소스. */
    private String toHtml(String markdown) {
        StringBuilder sb = new StringBuilder();
        boolean inList = false;
        for (String raw : markdown.split("\n", -1)) {
            String line = raw.trim();
            if (line.isEmpty()) {
                if (inList) { sb.append("</ul>"); inList = false; }
                continue;
            }
            if (line.startsWith("### ")) {
                if (inList) { sb.append("</ul>"); inList = false; }
                sb.append("<h3>").append(escape(line.substring(4))).append("</h3>");
            } else if (line.startsWith("## ")) {
                if (inList) { sb.append("</ul>"); inList = false; }
                sb.append("<h2>").append(escape(line.substring(3))).append("</h2>");
            } else if (line.startsWith("# ")) {
                if (inList) { sb.append("</ul>"); inList = false; }
                sb.append("<h1>").append(escape(line.substring(2))).append("</h1>");
            } else if (line.startsWith("- ")) {
                if (!inList) { sb.append("<ul>"); inList = true; }
                sb.append("<li>").append(escape(line.substring(2))).append("</li>");
            } else {
                if (inList) { sb.append("</ul>"); inList = false; }
                sb.append("<p>").append(escape(line)).append("</p>");
            }
        }
        if (inList) sb.append("</ul>");
        return sb.toString();
    }

    private static String escape(String v) {
        return v.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
