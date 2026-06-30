// 빌드 타임 검증: reCAPTCHA가 켜져 있는데 사이트 키가 없으면 빌드를 중단한다.
// NEXT_PUBLIC_* 는 `next build` 시점에 번들로 인라인되므로, 키 누락은 런타임이 아니라
// 빌드 직전에 잡아야 prod 까지 새는 것을 막을 수 있다.
// (lint/typecheck/dev 에는 영향을 주지 않도록 build 스크립트 전용으로 분리한다.)
const recaptchaEnabled = process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED !== 'false';

if (recaptchaEnabled && !process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
  console.error(
    '[check-build-env] NEXT_PUBLIC_RECAPTCHA_SITE_KEY is required when reCAPTCHA is enabled.\n' +
      '                  Set it as a GitHub repository variable before building.',
  );
  process.exit(1);
}
