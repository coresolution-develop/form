'use client';

import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

const ENABLED = process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED !== 'false';

export function useRecaptcha() {
  const { executeRecaptcha } = useGoogleReCaptcha();

  return async (action: string): Promise<string> => {
    if (!ENABLED) return '';
    if (!executeRecaptcha) throw new Error('reCAPTCHA not ready');
    return await executeRecaptcha(action);
  };
}
