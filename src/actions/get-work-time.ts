'use server'

import bigqueryClient from '@/lib/bigquery';
import { WorkTime } from '@/types/work-time';
import { unstable_noStore as noStore } from 'next/cache';

const ITEMS_PER_PAGE = 100; // 한 페이지당 100건

export async function getWorkTimeList(page: number = 1) {
  noStore();
  const offset = (page - 1) * ITEMS_PER_PAGE;

  // 1. 데이터 조회 (100건만)
  const dataQuery = `
    SELECT 
      ORGAID, ORGTXT, EMPNUM, NAMEKO, TITEXT, LETEXT, 
      CAST(TMDATE AS STRING) as TMDATE,
      WEEKTX, WKSCTX, BETIME, EDTIME, RETEXT
    FROM \`harimfood-361004.harim_sap_bi.HR_WorkTimeList\`
    WHERE TMDATE BETWEEN '2026-01-01' AND '2026-01-31'
    ORDER BY TMDATE DESC, NAMEKO ASC
    LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
  `;

  // 2. 전체 개수 조회 (페이지 계산용)
  const countQuery = `
    SELECT COUNT(*) as total
    FROM \`harimfood-361004.harim_sap_bi.HR_WorkTimeList\`
    WHERE TMDATE BETWEEN '2026-01-01' AND '2026-01-31'
  `;

  try {
    const [dataResult, countResult] = await Promise.all([
      bigqueryClient.query({ query: dataQuery }),
      bigqueryClient.query({ query: countQuery })
    ]);

    const data = dataResult[0] as WorkTime[];
    const totalCount = countResult[0][0].total;

    return {
      data,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / ITEMS_PER_PAGE)
    };

  } catch (error) {
    console.error('❌ BigQuery Error:', error);
    return { data: [], totalCount: 0, currentPage: 1, totalPages: 1 };
  }
}