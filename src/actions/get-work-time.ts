'use server'

import bigqueryClient from '@/lib/bigquery';
import { WorkTime } from '@/types/work-time';
import { unstable_noStore as noStore } from 'next/cache';

const ITEMS_PER_PAGE = 100;

export async function getWorkTimeList(page?: number, month?: string) {
  noStore();
  
  const isDashboardMode = page === undefined;
  
  // 1. 월 파라미터 처리 (없으면 2026-01 기본값)
  const targetMonth = month || '2026-01';
  
  // 2. 해당 월의 시작일과 종료일 계산 (JavaScript에서 계산하여 쿼리에 주입)
  const [year, mon] = targetMonth.split('-').map(Number);
  const startDate = `${targetMonth}-01`;
  const lastDay = new Date(year, mon, 0).getDate(); // 해당 월의 마지막 날짜
  const endDate = `${targetMonth}-${lastDay}`;

  let query = `
    SELECT 
      ORGAID, ORGTXT, EMPNUM, NAMEKO, TITEXT, LETEXT, 
      CAST(TMDATE AS STRING) as TMDATE,
      WEEKTX, WKSCTX, BETIME, EDTIME, RETEXT
    FROM \`harimfood-361004.harim_sap_bi.HR_WorkTimeList\`
    WHERE TMDATE BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY TMDATE DESC, NAMEKO ASC
  `;

  if (!isDashboardMode) {
    const offset = (page! - 1) * ITEMS_PER_PAGE;
    query += ` LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}`;
  }

  try {
    const [rows] = await bigqueryClient.query({ query });
    return rows as WorkTime[]; 
  } catch (error) {
    console.error('❌ BigQuery Error:', error);
    return [];
  }
}