/**
 * 업로드 이미지 URL 정규화.
 *
 * 저장된 값의 호스트(백엔드 API_URL 설정에 의존)가 틀려도 안전하도록, 경로(/uploads/...)만
 * 뽑아 프론트가 실제로 쓰는 API 베이스(NEXT_PUBLIC_API_URL)에 다시 붙인다.
 * 절대/상대 어떤 형태로 저장돼 있어도 현재 API 호스트로 교정된다(기존 잘못된 URL도 자동 복구).
 */
export function resolveAssetUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const base = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
