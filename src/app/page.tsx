import { getWorkTimeList } from '@/actions/get-work-time';
import Link from 'next/link';

export default async function Home({
  searchParams,
}: {
  // [변경 포인트 1] 타입을 Promise로 감싸야 합니다.
  searchParams: Promise<{ page?: string }>; 
}) {
  // [변경 포인트 2] URL 파라미터를 사용하기 전에 await로 기다려야 합니다.
  const params = await searchParams; 
  const currentPage = Number(params.page) || 1;
  
  // 데이터 조회 함수 호출
  const { data: workList, totalCount, totalPages } = await getWorkTimeList(currentPage);

  return (
    <main className="p-8">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold">근태/작업 시간 목록 (2026.01)</h1>
          <p className="text-gray-600 mt-2">
            총 <span className="text-blue-600 font-bold">{totalCount.toLocaleString()}</span>건 
            (현재 {currentPage} / {totalPages} 페이지)
          </p>
        </div>

        {/* 페이지네이션 버튼 */}
        <div className="flex gap-2">
          {/* 이전 버튼 */}
          <Link 
            href={`/?page=${currentPage > 1 ? currentPage - 1 : 1}`}
            className={`px-4 py-2 rounded transition-colors ${
              currentPage > 1 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-200 text-gray-400 pointer-events-none'
            }`}
            aria-disabled={currentPage <= 1}
          >
            ⬅️ 이전
          </Link>

          {/* 다음 버튼 */}
          <Link 
            href={`/?page=${currentPage < totalPages ? currentPage + 1 : totalPages}`}
            className={`px-4 py-2 rounded transition-colors ${
              currentPage < totalPages 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-200 text-gray-400 pointer-events-none'
            }`}
            aria-disabled={currentPage >= totalPages}
          >
            다음 ➡️
          </Link>
        </div>
      </div>
      
      {/* 데이터 테이블 */}
      {workList.length === 0 ? (
        <p className="text-gray-500">데이터가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto border rounded-lg shadow min-h-[600px]">
          <table className="w-full text-sm text-left text-gray-500 whitespace-nowrap">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 bg-gray-50">팀명</th>
                <th className="px-4 py-3 bg-gray-50">이름</th>
                <th className="px-4 py-3 bg-gray-50">날짜</th>
                <th className="px-4 py-3 bg-gray-50">출근</th>
                <th className="px-4 py-3 bg-gray-50">퇴근</th>
                <th className="px-4 py-3 bg-gray-50">근무유형</th>
              </tr>
            </thead>
            <tbody>
              {workList.map((item, index) => (
                <tr key={`${item.EMPNUM}-${item.TMDATE}-${index}`} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{item.ORGTXT}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{item.NAMEKO}</td>
                  <td className="px-4 py-3">{item.TMDATE}</td>
                  <td className="px-4 py-3">{item.BETIME}</td>
                  <td className="px-4 py-3">{item.EDTIME}</td>
                  <td className="px-4 py-3">{item.WKSCTX}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}