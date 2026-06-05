package net.sosyge.formflow.service.mail;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/** {{key}} 단순 치환 메일 템플릿 로더 (§11.2). */
@Component
public class MailTemplate {

    public String load(String name, Map<String, String> vars) {
        try (InputStream is = new ClassPathResource("mail/" + name + ".html").getInputStream()) {
            String html = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            for (var e : vars.entrySet()) {
                html = html.replace("{{" + e.getKey() + "}}", escape(e.getValue()));
            }
            return html;
        } catch (IOException e) {
            throw new IllegalStateException("mail template not found: " + name, e);
        }
    }

    private static String escape(String v) {
        return v == null ? "" : v.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
