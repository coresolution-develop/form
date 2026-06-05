package net.sosyge.formflow.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI(Swagger) 설정.
 * Bearer(JWT) 인증 스키마를 등록하여 Swagger UI에 Authorize 버튼이 노출되도록 한다.
 */
@Configuration
public class OpenApiConfig {

    private static final String SCHEME_NAME = "bearerAuth";

    @Bean
    public OpenAPI formflowOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("FormFlow API")
                        .description("FormFlow 백엔드 API 문서")
                        .version("0.1.0"))
                .addSecurityItem(new SecurityRequirement().addList(SCHEME_NAME))
                .components(new Components().addSecuritySchemes(SCHEME_NAME,
                        new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
