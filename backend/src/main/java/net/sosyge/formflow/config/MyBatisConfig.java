package net.sosyge.formflow.config;

import lombok.extern.slf4j.Slf4j;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;

import java.util.Arrays;
import java.util.List;

/**
 * MyBatis 매퍼 스캔 설정.
 * {@code net.sosyge.formflow.mapper} 패키지의 인터페이스를 매퍼 빈으로 등록한다.
 */
@Slf4j
@Configuration
@MapperScan("net.sosyge.formflow.mapper")
public class MyBatisConfig {

    private final ConfigurableListableBeanFactory beanFactory;

    public MyBatisConfig(ConfigurableListableBeanFactory beanFactory) {
        this.beanFactory = beanFactory;
    }

    private static final String MAPPER_PACKAGE = "net.sosyge.formflow.mapper";

    /** 기동 완료 시 매퍼 패키지에 속한 Mapper 빈 목록/개수를 로깅한다. (M1 검증용) */
    @EventListener(ApplicationReadyEvent.class)
    public void logRegisteredMappers() {
        List<String> mappers = Arrays.stream(beanFactory.getBeanDefinitionNames())
                .filter(name -> {
                    Class<?> type = beanFactory.getType(name);
                    return type != null && type.getName().startsWith(MAPPER_PACKAGE);
                })
                .sorted()
                .toList();
        log.info("[MYBATIS] Registered {} mapper beans: {}", mappers.size(), mappers);
    }
}
