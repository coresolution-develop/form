// §7.1 공통 응답 포맷 타입

/** 성공/실패 공통 응답. 실패 시 success=false, code/message가 채워진다. */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  code?: string;
  message?: string;
  details?: unknown;
}

/** 페이지네이션 응답 (data 자리에 들어가는 구조) */
export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  hasNext: boolean;
}
