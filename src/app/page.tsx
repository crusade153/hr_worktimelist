import { getWorkTimeList } from '@/actions/get-work-time';
import DashboardLayout from '@/components/DashboardLayout'; // V3 대신 이거 사용

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const targetMonth = params.month || '2026-01'; // 기본값
  
  // 서버에서 데이터 가져오기 (전체 모드)
  const allWorkData = await getWorkTimeList(undefined, targetMonth);

  return (
    // 레이아웃 컴포넌트가 전체 화면을 장악함
    <DashboardLayout rawData={allWorkData} currentMonth={targetMonth} />
  );
}