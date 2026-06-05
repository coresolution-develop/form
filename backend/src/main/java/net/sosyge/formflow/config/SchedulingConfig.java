package net.sosyge.formflow.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 배치 스케줄링 활성화 (§10.6).
 * 단일 인스턴스 가정. 다중 인스턴스 확장 시 ShedLock 도입 (M9 이후).
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
