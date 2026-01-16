import { WorkTime } from '@/types/work-time';

// 근무 시간 계산 (분 단위 -> 시간 단위)
export function calcWorkHours(betime: string, edtime: string): number {
  if (!betime || !edtime) return 0;
  
  try {
    const [sh, sm] = betime.split(':').map(Number);
    const [eh, em] = edtime.split(':').map(Number);
    
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
    
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60; // 자정을 넘긴 경우
    
    return Number(((mins > 60 ? mins - 60 : mins) / 60).toFixed(1)); // 휴게시간 1시간 제외 가정
  } catch (e) {
    return 0;
  }
}

// 근태 유형 분류
export function classifyAttendance(item: WorkTime) {
  const retext = item.RETEXT?.trim() || '';
  const betime = item.BETIME;
  const edtime = item.EDTIME;

  // RETEXT가 없고 출퇴근 시간이 없으면 -> 누락
  if (!retext) {
    if (betime && edtime) return { type: 'normal', label: '정상' };
    return { type: 'missing', label: '미체크' };
  }

  if (retext === '결근(무단결근)') return { type: 'absent', label: retext };
  
  const normalTypes = ['정상', '조퇴', '지각'];
  if (normalTypes.includes(retext)) return { type: 'normal', label: retext };

  return { type: 'offDuty', label: retext };
}

// 메인 분석 함수
export function analyzeData(data: WorkTime[]) {
  const stats = {
    totalEmp: new Set<string>(), // 전체 고유 인원
    working: 0, // 실근무
    offDuty: 0, // 휴무
    missing: 0, // 누락
    absent: 0,  // 무단결근
    totalWorkHours: 0,
    weekendWork: 0, // 주말 근무 건수
    longWork: 0,    // 장시간 근무 건수
    
    // 리스트 데이터
    missingList: [] as WorkTime[],
    absentList: [] as WorkTime[],
    weekendList: [] as (WorkTime & { hours: number })[],
    
    // 그룹별 통계
    daily: {} as Record<string, any>,
    dept: {} as Record<string, any>,
    
    // 주간 근무 시간 집계용 (사번-주차별)
    weeklyWork: {} as Record<string, number>,
    // 장시간 근무자 목록 (주 50시간 초과)
    longWorkList: [] as { empNum: string, name: string, dept: string, week: string, hours: number }[],
    // 검색된 개인의 상세 기록 (검색 시 사용)
    individualRecords: [] as (WorkTime & { hours: number, status: string })[]
  };

  data.forEach((row) => {
    stats.totalEmp.add(row.EMPNUM);
    const date = row.TMDATE;
    const dept = row.ORGTXT || '미지정';
    const isWeekend = row.WEEKTX === '토' || row.WEEKTX === '일';
    const { type, label } = classifyAttendance(row);
    const hours = calcWorkHours(row.BETIME, row.EDTIME);

    // 개인 기록 저장 (검색용)
    stats.individualRecords.push({ ...row, hours, status: label });

    // 1. 주간 근무 시간 누적
    const weekNum = getWeekNumber(new Date(date));
    const weekKey = `${row.EMPNUM}-${weekNum}`;
    if (!stats.weeklyWork[weekKey]) stats.weeklyWork[weekKey] = 0;
    
    if (type === 'normal') {
      stats.working++;
      stats.totalWorkHours += hours;
      stats.weeklyWork[weekKey] += hours; // 주간 시간 누적
    } else if (type === 'offDuty') stats.offDuty++;
    else if (type === 'missing') {
      stats.missing++;
      stats.missingList.push(row);
    } else if (type === 'absent') {
      stats.absent++;
      stats.absentList.push(row);
    }

    if (isWeekend && type === 'normal') {
      stats.weekendWork++;
      stats.weekendList.push({ ...row, hours });
    }

    // 2. 일자별 통계 초기화 및 집계
    if (!stats.daily[date]) {
      stats.daily[date] = { date, weekday: row.WEEKTX, total: 0, working: 0, offDuty: 0, missing: 0, absent: 0, isWeekend };
    }
    stats.daily[date].total++;
    if (type === 'normal') stats.daily[date].working++;
    else if (type === 'offDuty') stats.daily[date].offDuty++;
    else if (type === 'missing') stats.daily[date].missing++;
    else if (type === 'absent') stats.daily[date].absent++;

    // 3. 부서별 통계 (평일 기준)
    if (!isWeekend) {
      if (!stats.dept[dept]) {
        stats.dept[dept] = { name: dept, total: 0, normal: 0, missing: 0, absent: 0, workSum: 0, empCount: new Set() };
      }
      stats.dept[dept].total++;
      stats.dept[dept].empCount.add(row.EMPNUM);
      if (type === 'normal') {
        stats.dept[dept].normal++;
        stats.dept[dept].workSum += hours;
      } else if (type === 'missing') stats.dept[dept].missing++;
      else if (type === 'absent') stats.dept[dept].absent++;
    }
  });

  // 주간 50시간 초과자 필터링
  const processedWeeks = new Set<string>(); // 중복 제거용
  
  data.forEach(row => {
    const weekNum = getWeekNumber(new Date(row.TMDATE));
    const key = `${row.EMPNUM}-${weekNum}`;
    
    if (!processedWeeks.has(key) && stats.weeklyWork[key] > 50) {
      stats.longWorkList.push({
        empNum: row.EMPNUM,
        name: row.NAMEKO,
        dept: row.ORGTXT,
        week: `${weekNum}주차`,
        hours: stats.weeklyWork[key]
      });
      processedWeeks.add(key);
    }
  });

  return stats;
}

// 주차 계산 헬퍼 함수 (라이브러리 없이 직접 구현)
function getWeekNumber(d: Date) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}