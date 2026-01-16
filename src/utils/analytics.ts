// src/utils/analytics.ts
import { WorkTime } from '@/types/work-time';
import { getISOWeek, parseISO } from 'date-fns'; // 날짜 라이브러리 활용 추천 (없으면 기본 로직 사용)

// 근무 시간 계산 (기존 유지)
export function calcWorkHours(betime: string, edtime: string): number {
  if (!betime || !edtime) return 0;
  try {
    const [sh, sm] = betime.split(':').map(Number);
    const [eh, em] = edtime.split(':').map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
    
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60;
    return Number(((mins > 60 ? mins - 60 : mins) / 60).toFixed(1)); // 휴게 1시간 제외
  } catch (e) { return 0; }
}

export function classifyAttendance(item: WorkTime) {
  const retext = item.RETEXT?.trim() || '';
  const betime = item.BETIME;
  const edtime = item.EDTIME;

  if (!retext) {
    if (betime && edtime) return { type: 'normal', label: '정상' };
    return { type: 'missing', label: '미체크' };
  }
  if (retext === '결근(무단결근)') return { type: 'absent', label: retext };
  const normalTypes = ['정상', '조퇴', '지각'];
  if (normalTypes.includes(retext)) return { type: 'normal', label: retext };
  return { type: 'offDuty', label: retext };
}

export function analyzeData(data: WorkTime[]) {
  const stats = {
    totalEmp: new Set<string>(),
    working: 0, offDuty: 0, missing: 0, absent: 0,
    totalWorkHours: 0, weekendWork: 0,
    
    // 리스트 데이터
    missingList: [] as WorkTime[],
    absentList: [] as WorkTime[],
    weekendList: [] as (WorkTime & { hours: number })[],
    
    // 그룹별
    daily: {} as Record<string, any>,
    dept: {} as Record<string, any>,
    
    // [NEW] 주간 근무 시간 집계용 (사번-주차별)
    weeklyWork: {} as Record<string, number>,
    // [NEW] 장시간 근무자 목록 (주 50시간 초과)
    longWorkList: [] as { empNum: string, name: string, dept: string, week: string, hours: number }[],
    // [NEW] 검색된 개인의 상세 기록 (검색 시 사용)
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

    // 1. 주간 근무 시간 누적 (ISO 주차 기준)
    // 간단하게 연도-주차 키 생성 (예: 2026-W03)
    const weekKey = `${row.EMPNUM}-${getWeekNumber(new Date(date))}`;
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

    // 일자별/부서별 집계 (기존 로직 유지)
    if (!stats.daily[date]) {
      stats.daily[date] = { date, weekday: row.WEEKTX, total: 0, working: 0, offDuty: 0, missing: 0, absent: 0, isWeekend };
    }
    stats.daily[date].total++;
    if (type === 'normal') stats.daily[date].working++;
    else if (type === 'offDuty') stats.daily[date].offDuty++;
    else if (type === 'missing') stats.daily[date].missing++;
    else if (type === 'absent') stats.daily[date].absent++;

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

  // [NEW] 주간 50시간 초과자 필터링
  // weeklyWork: { "102001-3": 52.5 } 형태
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

// 주차 계산 헬퍼 함수
function getWeekNumber(d: Date) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}