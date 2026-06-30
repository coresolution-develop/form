// 빌드 타임 검증: reCAPTCHA가 켜져 있는데 사이트 키가 없으면 빌드를 실패시킨다.
// NEXT_PUBLIC_* 는 빌드 시점에 번들로 인라인되므로, 키 누락은 런타임이 아니라
// 여기서 잡아야 prod 까지 새는 것을 막을 수 있다.
const recaptchaEnabled = process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED !== 'false';
if (recaptchaEnabled && !process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
  throw new Error(
    'NEXT_PUBLIC_RECAPTCHA_SITE_KEY is required when reCAPTCHA is enabled. ' +
      'Set it as a GitHub repository variable before building.',
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
