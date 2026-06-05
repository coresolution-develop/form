package net.sosyge.formflow.common;

import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 컨트롤러 파라미터에 현재 인증 주체(CustomUserDetails)를 주입하는 단축 어노테이션.
 * {@code @AuthenticationPrincipal} 의 메타 어노테이션.
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
@AuthenticationPrincipal
public @interface CurrentUser {
}
