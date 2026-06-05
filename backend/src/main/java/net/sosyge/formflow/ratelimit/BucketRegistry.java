package net.sosyge.formflow.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

/**
 * 키별 Bucket 보관소.
 *
 * <p>M2-A: 단일 인스턴스용 in-memory(Bucket4j core) 구현. 로컬은 RateLimit 비활성이라 미사용.
 * 다중 인스턴스 운영에서는 bucket4j-redis(LettuceBasedProxyManager)로 교체 예정.
 */
@Component
public class BucketRegistry {

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    public Bucket resolve(String key, Bandwidth bandwidth) {
        return buckets.computeIfAbsent(key, k -> Bucket.builder().addLimit(bandwidth).build());
    }
}
