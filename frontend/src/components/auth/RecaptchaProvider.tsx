'use client';

import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

export function RecaptchaProvider({ children }: { children: React.ReactNode }) {
  const enabled = process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED !== 'false';
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!;

  // 비활성 시 GoogleReCaptchaProvider를 마운트하지 않는다 (스크립트 로드 자체 차단).
  if (!enabled) return <>{children}</>;

  return (
    <GoogleReCaptchaProvider reCaptchaKey={siteKey} scriptProps={{ async: true, defer: true }}>
      {children}
    </GoogleReCaptchaProvider>
  );
}
