import Link from 'next/link';

export default function SignupSentPage() {
  return (
    <div className="flex flex-col gap-4 text-center">
      <h1 className="text-xl font-semibold text-gray-900">메일을 확인해주세요</h1>
      <p className="text-sm text-gray-600">
        입력하신 이메일로 인증 링크를 보냈습니다.
        <br />
        메일의 버튼을 눌러 인증을 완료하면 로그인됩니다.
      </p>
      <p className="text-xs text-gray-400">메일이 오지 않았다면 스팸함을 확인해주세요. (유효기간 24시간)</p>
      <Link href="/login" className="mt-2 text-sm text-blue-600 hover:underline">
        로그인 페이지로
      </Link>
    </div>
  );
}
