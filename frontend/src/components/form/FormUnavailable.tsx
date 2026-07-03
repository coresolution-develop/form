/**
 * 공개 설문이 마감/삭제/한도초과/미공개거나 주소가 잘못됐을 때 응답자에게 보이는 안내 화면.
 * 백엔드는 이들 경우를 (존재 노출 방지 위해) 동일 오류로 통일하므로 화면도 단일 메시지로 안내한다.
 * 기존의 밋밋한 기본 404 대신 브랜드 톤의 친절한 안내를 준다.
 */
export function FormUnavailable() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="h-1.5 bg-brand" />
        <div className="px-8 py-12">
          <h1 className="text-xl font-semibold text-gray-900">이용할 수 없는 설문입니다</h1>
          <p className="mt-2 text-sm text-gray-500">마감되었거나, 주소가 변경·삭제되었을 수 있어요.</p>
          <p className="mt-1 text-xs text-gray-400">링크를 다시 확인해 주세요.</p>
        </div>
      </div>
    </main>
  );
}
