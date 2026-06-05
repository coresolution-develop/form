package net.sosyge.formflow.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * Redis 설정.
 * 이메일/리셋 토큰 임시 저장, Refresh Token 블랙리스트, Rate Limit 카운터 등은
 * 문자열 기반 연산이 대부분이므로 {@link StringRedisTemplate}을 기본 빈으로 제공한다.
 */
@Configuration
public class RedisConfig {

    @Bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory connectionFactory) {
        return new StringRedisTemplate(connectionFactory);
    }
}
