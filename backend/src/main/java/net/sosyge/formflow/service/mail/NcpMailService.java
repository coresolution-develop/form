package net.sosyge.formflow.service.mail;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.sosyge.formflow.exception.BusinessException;
import net.sosyge.formflow.exception.ErrorCode;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * NCP Cloud Outbound Mailer 발송 (§11.1). HMAC v2 서명 REST 호출.
 * {@code formflow.mail.provider=ncp} 일 때만 활성 — 로컬(smtp)에서는 뜨지 않는다.
 */
@Slf4j
@Service
@ConditionalOnProperty(name = "formflow.mail.provider", havingValue = "ncp")
@RequiredArgsConstructor
public class NcpMailService implements MailService {

    private static final String API_URL = "https://mail.apigw.ntruss.com/api/v1/mails";

    private final MailProperties props;
    private final RestTemplate restTemplate;

    @Override
    @Async("mailExecutor")
    public void send(String to, String subject, String htmlBody) {
        long timestamp = System.currentTimeMillis();
        String signature = makeSignature("POST", "/api/v1/mails", timestamp,
                props.getNcp().getAccessKey(), props.getNcp().getSecretKey());

        Map<String, Object> body = Map.of(
                "senderAddress", props.getFrom(),
                "senderName", props.getFromName(),
                "title", subject,
                "body", htmlBody,
                "recipients", List.of(Map.of("address", to, "type", "R")),
                "individual", true,
                "advertising", false
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-ncp-apigw-timestamp", String.valueOf(timestamp));
        headers.set("x-ncp-iam-access-key", props.getNcp().getAccessKey());
        headers.set("x-ncp-apigw-signature-v2", signature);

        try {
            restTemplate.postForEntity(API_URL, new HttpEntity<>(body, headers), Map.class);
            log.info("[MAIL][NCP] sent to={} subject={}", to, subject);
        } catch (RestClientException e) {
            log.error("[MAIL][NCP] send failed to={} subject={}", to, subject, e);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "메일 발송에 실패했습니다.");
        }
    }

    private static String makeSignature(String method, String uri, long timestamp,
                                        String accessKey, String secretKey) {
        String space = " ";
        String newLine = "\n";
        String message = method + space + uri + newLine + timestamp + newLine + accessKey;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getEncoder().encodeToString(mac.doFinal(message.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
