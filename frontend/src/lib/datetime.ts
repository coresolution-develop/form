/** ISO 문자열을 'YYYY-MM-DD HH:mm' 형태로. null/빈값은 '—'. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return iso.replace('T', ' ').slice(0, 16);
}

/** ISO 문자열을 'YYYY-MM-DD' 로. null/빈값은 '—'. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return iso.slice(0, 10);
}
