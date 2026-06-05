package net.sosyge.formflow.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.sosyge.formflow.exception.BusinessException;
import net.sosyge.formflow.exception.ErrorCode;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * reCAPTCHA v3 검증 (§11.3, §3-A.7 보강).
 * RECAPTCHA_ENABLED=false 면 검증을 건너뛴다 (로컬).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RecaptchaVerifier {

    private static final String URL = "https://www.google.com/recaptcha/api/siteverify";

    private final RecaptchaProperties props;
    private final RestTemplate restTemplate;

    public void verify(String token, String action, double threshold) {
        if (!props.isEnabled()) {
            log.debug("[RECAPTCHA] disabled — skip verify");
            return;
        }
        if (!StringUtils.hasText(token)) {
            throw new BusinessException(ErrorCode.RECAPTCHA_FAILED);
        }

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("secret", props.getSecret());
        body.add("response", token);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        Map<?, ?> res;
        try {
            res = restTemplate.postForObject(URL, new HttpEntity<>(body, headers), Map.class);
        } catch (RestClientException e) {
            log.error("[RECAPTCHA] verify error", e);
            throw new BusinessException(ErrorCode.RECAPTCHA_FAILED);
        }

        if (res == null) {
            throw new BusinessException(ErrorCode.RECAPTCHA_FAILED);
        }
        Boolean success = (Boolean) res.get("success");
        Number score = (Number) res.get("score");
        String resAction = (String) res.get("action");

        if (success == null || !success
                || score == null || score.doubleValue() < threshold
                || (action != null && !action.equals(resAction))) {
            log.warn("[RECAPTCHA] reject success={} score={} action={}", success, score, resAction);
            throw new BusinessException(ErrorCode.RECAPTCHA_FAILED);
        }
    }
}
