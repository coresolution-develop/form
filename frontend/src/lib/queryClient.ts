import { QueryClient } from '@tanstack/react-query';

/**
 * QueryClient 팩토리.
 *
 * <p>App Router에서는 모듈 스코프 단일 인스턴스를 두면 SSR/dev 간 상태가 공유되는 버그가
 * 발생하므로, providers.tsx에서 {@code useState(() => makeQueryClient())}로 컴포넌트당 1회 생성한다.
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 4xx(권한/검증 등)는 재시도해도 동일하므로 즉시 에러로 settle. 5xx/네트워크만 1회 재시도.
        retry: (failureCount, error) => {
          const status = (error as any)?.response?.status;
          if (typeof status === 'number' && status >= 400 && status < 500) return false;
          return failureCount < 1;
        },
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
    },
  });
}
