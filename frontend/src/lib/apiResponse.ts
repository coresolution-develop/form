import type { ApiResponse } from '@/types/api';

/** 응답이 성공인지 판별한다. */
export function isSuccess<T>(res: ApiResponse<T>): boolean {
  return res.success === true;
}

/**
 * 성공 응답에서 data를 꺼낸다. 실패 응답이면 code를 메시지로 한 Error를 던진다.
 * (호출부에서 try/catch 또는 errorMessage.toUserMessage와 함께 사용)
 */
export function unwrap<T>(res: ApiResponse<T>): T {
  if (!res.success) {
    throw new Error(res.code ?? 'UNKNOWN_ERROR');
  }
  return res.data as T;
}
