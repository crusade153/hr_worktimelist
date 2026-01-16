import { getWorkTimeList } from '@/actions/get-work-time';

export default async function Home() {
  const workList = await getWorkTimeList();

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">근태/작업 시간 목록</h1>
      
      {/* 데이터가 없을 경우 처리 */}
      {workList.length === 0 ? (
        <p>데이터가 없거나 불러오는 중 에러가 발생했습니다.</p>
      ) : (
        <div className="overflow-x-auto border rounded-lg shadow">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-6 py-3">사번 (EMPNUM)</th>
                <th className="px-6 py-3">이름 (NAMEKO)</th>
                <th className="px-6 py-3">직급 (TITEXT)</th>
              </tr>
            </thead>
            <tbody>
              {workList.map((item, index) => (
                <tr key={index} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4">{item.EMPNUM}</td>
                  <td className="px-6 py-4">{item.NAMEKO}</td>
                  <td className="px-6 py-4">{item.TITEXT}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}