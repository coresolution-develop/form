const MAP: Record<string, string> = {
  VALIDATION_ERROR: '입력값을 확인해주세요.',
  BAD_REQUEST: '잘못된 요청입니다.',
  INVALID_TOKEN: '유효하지 않거나 만료된 링크입니다.',
  PASSWORD_POLICY: '비밀번호는 8자 이상이며 영문/숫자/특수문자 중 3종류 이상 포함해야 합니다.',
  RECAPTCHA_FAILED: '보안 검증에 실패했습니다. 다시 시도해주세요.',
  EMAIL_ALREADY_EXISTS: '이미 가입된 이메일입니다.',
  UNAUTHORIZED: '로그인이 필요합니다.',
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다.',
  EMAIL_NOT_VERIFIED: '이메일 인증이 필요합니다.',
  ACCOUNT_SUSPENDED: '이용이 정지된 계정입니다.',
  FORBIDDEN: '권한이 없습니다.',
  NOT_FOUND: '존재하지 않습니다.',
  FORM_NOT_AVAILABLE: '존재하지 않거나 응답할 수 없는 폼입니다.',
  DUPLICATE_RESPONSE: '이미 응답한 폼입니다.',
  ILLEGAL_STATE: '현재 상태에서는 처리할 수 없습니다.',
  PLAN_LIMIT_EXCEEDED: '플랜 한도를 초과했습니다.',
  RATE_LIMITED: '잠시 후 다시 시도해주세요.',
  INTERNAL_ERROR: '일시적인 오류가 발생했습니다.',
};

export function toUserMessage(code?: string, fallback?: string) {
  if (code && MAP[code]) return MAP[code];
  return fallback ?? '오류가 발생했습니다.';
}
